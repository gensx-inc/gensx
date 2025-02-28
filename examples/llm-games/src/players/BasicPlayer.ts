import { Move, BasePlayer } from "../models/Player";
import { Board } from "../models/Board";

export class BasicPlayer extends BasePlayer {
  constructor(name: string, symbol: "X" | "O") {
    super(name, symbol);
  }

  private checkForTwoInARow(grid: string[][], symbol: string): Move | null {
    // Check rows
    for (let i = 0; i < 3; i++) {
      const row = grid[i];
      if (
        row.filter((cell) => cell === symbol).length === 2 &&
        row.includes("")
      ) {
        const col = row.findIndex((cell) => cell === "");
        if (col !== -1) return { row: i + 1, column: col + 1 };
      }
    }

    // Check columns
    for (let j = 0; j < 3; j++) {
      const column = grid.map((row) => row[j]);
      if (
        column.filter((cell) => cell === symbol).length === 2 &&
        column.includes("")
      ) {
        const row = column.findIndex((cell) => cell === "");
        if (row !== -1) return { row: row + 1, column: j + 1 };
      }
    }

    // Check diagonals
    const diagonal1 = [grid[0][0], grid[1][1], grid[2][2]];
    if (
      diagonal1.filter((cell) => cell === symbol).length === 2 &&
      diagonal1.includes("")
    ) {
      const index = diagonal1.findIndex((cell) => cell === "");
      if (index !== -1) return { row: index + 1, column: index + 1 };
    }

    const diagonal2 = [grid[0][2], grid[1][1], grid[2][0]];
    if (
      diagonal2.filter((cell) => cell === symbol).length === 2 &&
      diagonal2.includes("")
    ) {
      const index = diagonal2.findIndex((cell) => cell === "");
      if (index !== -1) return { row: index + 1, column: 3 - index };
    }

    return null;
  }

  public async getMove(board: Board): Promise<Move> {
    const grid = board.getGrid();
    const opponent = this.symbol === "X" ? "O" : "X";

    // Rule 1: Take winning move if available
    const winningMove = this.checkForTwoInARow(grid, this.symbol);
    if (winningMove) return winningMove;

    // Rule 2: Block opponent's winning move
    const blockingMove = this.checkForTwoInARow(grid, opponent);
    if (blockingMove) return blockingMove;

    // Rule 3: Random move
    const availableMoves = this.getAvailableMoves(board);
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }
}
