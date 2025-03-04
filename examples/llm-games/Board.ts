import { Move } from "./types.js";

export class Board {
  private grid: string[][];

  constructor() {
    this.grid = [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ];
  }

  public makeMove(row: number, column: number, player: "X" | "O"): boolean {
    // Convert from 1-based to 0-based indexing
    const adjustedRow = row - 1;
    const adjustedColumn = column - 1;
    if (this.isValidMove(row, column)) {
      this.grid[adjustedRow][adjustedColumn] = player;
      return true;
    }
    return false;
  }

  public isValidMove(row: number, column: number): boolean {
    // Convert from 1-based to 0-based indexing
    const adjustedRow = row - 1;
    const adjustedCol = column - 1;
    return (
      adjustedRow >= 0 &&
      adjustedRow < 3 &&
      adjustedCol >= 0 &&
      adjustedCol < 3 &&
      this.grid[adjustedRow][adjustedCol] === ""
    );
  }

  public checkWinner(): string | null {
    // Check rows
    for (let i = 0; i < 3; i++) {
      if (
        this.grid[i][0] &&
        this.grid[i][0] === this.grid[i][1] &&
        this.grid[i][1] === this.grid[i][2]
      ) {
        return this.grid[i][0];
      }
    }

    // Check columns
    for (let i = 0; i < 3; i++) {
      if (
        this.grid[0][i] &&
        this.grid[0][i] === this.grid[1][i] &&
        this.grid[1][i] === this.grid[2][i]
      ) {
        return this.grid[0][i];
      }
    }

    // Check diagonals
    if (
      this.grid[0][0] &&
      this.grid[0][0] === this.grid[1][1] &&
      this.grid[1][1] === this.grid[2][2]
    ) {
      return this.grid[0][0];
    }
    if (
      this.grid[0][2] &&
      this.grid[0][2] === this.grid[1][1] &&
      this.grid[1][1] === this.grid[2][0]
    ) {
      return this.grid[0][2];
    }

    return null;
  }

  public getWinningMoves(player: "X" | "O"): Move[] {
    const winningMoves: Move[] = [];
    // Try each empty cell
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (this.grid[i][j] === "") {
          // Make the move
          this.grid[i][j] = player;
          // Check if it's a winning move
          const isWinning = this.checkWinner() === player;
          // Undo the move
          this.grid[i][j] = "";
          if (isWinning) {
            winningMoves.push({ row: i + 1, column: j + 1 });
          }
        }
      }
    }
    return winningMoves;
  }

  public getBlockingMoves(player: "X" | "O"): Move[] {
    const opponent = player === "X" ? "O" : "X";
    const blockingMoves: Move[] = [];

    // Try each empty cell
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (this.grid[i][j] === "") {
          // Try opponent's move here
          this.grid[i][j] = opponent;
          // Check if it would be a win for opponent
          const wouldBeWin = this.checkWinner() === opponent;
          // Undo the move
          this.grid[i][j] = "";
          // If opponent would win here, this is a blocking move opportunity
          if (wouldBeWin) {
            blockingMoves.push({ row: i + 1, column: j + 1 });
          }
        }
      }
    }
    return blockingMoves;
  }

  public isFull(): boolean {
    return this.grid.every((row) => row.every((cell) => cell !== ""));
  }

  public toString(): string {
    const header = "    1   2   3";
    const separator = "  +---+---+---+";
    const rows = ["1", "2", "3"].map((label, i) => {
      const cells = this.grid[i].map((cell) => cell || ".").join(" | ");
      return `${label} | ${cells} |`;
    });

    return [
      header,
      separator,
      rows[0],
      separator,
      rows[1],
      separator,
      rows[2],
      separator,
    ].join("\n");
  }

  public getGrid(): string[][] {
    return this.grid.map((row) => [...row]);
  }

  // The toJSON method allows use to control how the board is serialized to JSON in GenSX checkpoints
  public toJSON(): {
    row1: string;
    row2: string;
    row3: string;
  } {
    return {
      row1: "| " + this.grid[0].map((cell) => cell || " ").join(" | ") + " |",
      row2: "| " + this.grid[1].map((cell) => cell || " ").join(" | ") + " |",
      row3: "| " + this.grid[2].map((cell) => cell || " ").join(" | ") + " |",
    };
  }

  public getRandomMove(): Move | null {
    const availableMoves: Move[] = [];

    // Find all empty cells
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (this.grid[i][j] === "") {
          // Convert from 0-based to 1-based indexing for the return value
          availableMoves.push({ row: i + 1, column: j + 1 });
        }
      }
    }

    // If no moves are available, return null
    if (availableMoves.length === 0) {
      return null;
    }

    // Select a random move from the available moves
    const randomIndex = Math.floor(Math.random() * availableMoves.length);
    return availableMoves[randomIndex];
  }

  public getBasicStrategyMove(player: "X" | "O"): Move | null {
    // Check for winning moves
    const winningMoves = this.getWinningMoves(player);
    if (winningMoves.length > 0) {
      return winningMoves[0]; // Return the first winning move found
    }

    // Check for blocking moves
    const blockingMoves = this.getBlockingMoves(player);
    if (blockingMoves.length > 0) {
      return blockingMoves[0]; // Return the first blocking move found
    }

    // Fall back to a random move if neither winning nor blocking moves exist
    return this.getRandomMove();
  }
}
