import { gsx } from "gensx";

import { Board } from "./Board.js";
import { MakeMove } from "./MakeMove.js";
import { Player, PlayerSymbol } from "./types.js";

interface PlayGameProps {
  playerX: Player;
  playerO: Player;
}

interface PlayGameResult {
  winner: string;
  playerXStats: PlayerStats;
  playerOStats: PlayerStats;
  board: {
    row1: string;
    row2: string;
    row3: string;
  };
}

interface PlayerStats {
  missedWins: number;
  missedBlocks: number;
  invalidMoves: number;
}

export const PlayGame = gsx.Component<PlayGameProps, PlayGameResult>(
  "PlayGame",
  async ({ playerX, playerO }) => {
    const playerXStats: PlayerStats = {
      missedWins: 0,
      missedBlocks: 0,
      invalidMoves: 0,
    };

    const playerOStats: PlayerStats = {
      missedWins: 0,
      missedBlocks: 0,
      invalidMoves: 0,
    };

    // Set up initial state
    const board = new Board();
    let currentPlayerSymbol: PlayerSymbol = "X";
    let currentPlayer: Player;

    // Play the game
    let moveNumber = 1;
    while (!board.checkWinner() && !board.isFull()) {
      // Make the move
      currentPlayer = currentPlayerSymbol === "X" ? playerX : playerO;
      const moveDetails = await MakeMove.run({
        playerSymbol: currentPlayerSymbol,
        player: currentPlayer,
        board,
        componentOpts: {
          name: `Move ${moveNumber}: ${currentPlayer.model} (${currentPlayerSymbol})`,
        },
      });
      // const moveDetails = gsx.execute(<MakeMove name="move1"/>)

      const { move, isFallback } = moveDetails;

      // Process the move
      const isValidMove = board.isValidMove(move.row, move.col);
      if (!isValidMove || isFallback) {
        if (currentPlayerSymbol === "X") {
          playerXStats.invalidMoves++;
        } else {
          playerOStats.invalidMoves++;
        }
      }
      const winningMoves = board.getWinningMoves(currentPlayerSymbol);
      const blockingMoves = board.getBlockingMoves(currentPlayerSymbol);

      if (winningMoves.length > 0) {
        if (
          !winningMoves.some((m) => m.row === move.row && m.column === move.col)
        ) {
          if (currentPlayerSymbol === "X") {
            playerXStats.missedWins++;
          } else {
            playerOStats.missedWins++;
          }
        }
      } else if (blockingMoves.length > 0) {
        if (
          !blockingMoves.some(
            (m) => m.row === move.row && m.column === move.col,
          )
        ) {
          if (currentPlayerSymbol === "X") {
            playerXStats.missedBlocks++;
          } else {
            playerOStats.missedBlocks++;
          }
        }
      }

      // Update the board
      board.makeMove(move.row, move.col, currentPlayerSymbol);

      // Switch players
      currentPlayerSymbol = currentPlayerSymbol === "X" ? "O" : "X";
      moveNumber++;
    }

    const winner = board.checkWinner();
    return {
      winner: winner ?? "draw",
      playerXStats,
      playerOStats,
      board: board.toJSON(),
    };
  },
);
