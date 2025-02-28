import { Board } from "./models/Board";
import { Player } from "./models/Player";
import { GameStats } from "./models/GameStats";
import Logger from "./utils/logger";

export type GameResult = {
  result: string;
  stats: GameStats;
};

export class Game {
  private board: Board;
  private playerX: Player;
  private playerO: Player;
  private currentPlayer: "X" | "O";
  private gameStats: GameStats;
  private gameId: string;
  private moveCount: number;

  constructor(playerX: Player, playerO: Player) {
    this.board = new Board();
    this.playerX = playerX;
    this.playerO = playerO;
    this.currentPlayer = "X";
    this.gameStats = new GameStats();
    this.gameId = Logger.startNewGame();
    this.moveCount = 0;
    // Initialize stats for both players to ensure they show up even if all zeros
    this.gameStats.getPlayerStats(playerX.getName());
    this.gameStats.getPlayerStats(playerO.getName());
  }

  public async play(): Promise<GameResult> {
    while (!this.board.checkWinner() && !this.board.isFull()) {
      console.log(this.board.toString());
      console.log("\n\n" + "=".repeat(20) + "\n\n");

      const currentLLMPlayer =
        this.currentPlayer === "X" ? this.playerX : this.playerO;

      console.log(currentLLMPlayer.getName() + " move: ");
      const move = await currentLLMPlayer.getMove(this.board);

      // Check for missed opportunities before applying the move
      const winningMoves = this.board.hasWinningMove(this.currentPlayer);
      let isMissedWin = false;
      let isMissedBlock = false;

      if (winningMoves.length > 0) {
        // Check if the chosen move was one of the winning moves
        if (
          !winningMoves.some(
            (m) => m.row === move.row && m.column === move.column
          )
        ) {
          this.gameStats.recordMissedWin(currentLLMPlayer.getName());
          isMissedWin = true;
        }
      } else {
        // Only check for blocking moves if there were no winning moves
        const blockingMoves = this.board.hasBlockingMove(this.currentPlayer);
        if (blockingMoves.length > 0) {
          // Check if the chosen move was one of the blocking moves
          if (
            !blockingMoves.some(
              (m) => m.row === move.row && m.column === move.column
            )
          ) {
            this.gameStats.recordMissedBlock(currentLLMPlayer.getName());
            isMissedBlock = true;
          }
        }
      }

      // Record if this was a fallback move (invalid move attempted)
      const isInvalidMove = move.isFallback || false;
      if (isInvalidMove) {
        this.gameStats.recordInvalidMove(currentLLMPlayer.getName());
      }

      // We know the move is valid since invalid moves trigger fallback
      this.board.makeMove(move.row, move.column, this.currentPlayer);

      // Log the move
      Logger.logGameMove(
        this.gameId,
        currentLLMPlayer.getName(),
        ++this.moveCount,
        move.row,
        move.column,
        this.board.toString(),
        isInvalidMove,
        isMissedWin,
        isMissedBlock
      );

      this.currentPlayer = this.currentPlayer === "X" ? "O" : "X";
    }

    console.log("\nFinal board:");
    console.log(this.board.toString());

    const winner = this.board.checkWinner();
    let result = "";
    if (winner) {
      result = `${
        winner === "X" ? this.playerX.getName() : this.playerO.getName()
      } wins!`;
    } else {
      result = "It's a draw!";
    }

    // Add performance stats to the result string and return both result and stats
    return {
      result: result,
      stats: this.gameStats,
    };
  }

  public getGameId(): string {
    return this.gameId;
  }
}
