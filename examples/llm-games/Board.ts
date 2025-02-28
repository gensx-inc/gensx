export class Board {
  private grid: string[][];

  constructor() {
    this.grid = [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ];
  }

  public makeMove(row: number, col: number, player: "X" | "O"): boolean {
    // Convert from 1-based to 0-based indexing
    const adjustedRow = row - 1;
    const adjustedCol = col - 1;
    if (this.isValidMove(row, col)) {
      this.grid[adjustedRow][adjustedCol] = player;
      return true;
    }
    return false;
  }

  public isValidMove(row: number, col: number): boolean {
    // Convert from 1-based to 0-based indexing
    const adjustedRow = row - 1;
    const adjustedCol = col - 1;
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

  public getWinningMoves(player: "X" | "O"): { row: number; column: number }[] {
    const winningMoves: { row: number; column: number }[] = [];
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

  public getBlockingMoves(
    player: "X" | "O",
  ): { row: number; column: number }[] {
    const opponent = player === "X" ? "O" : "X";
    const blockingMoves: { row: number; column: number }[] = [];

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

  public toJSON(): string {
    return this.toString();
  }

  public getRandomMove(): { row: number; column: number } | null {
    const availableMoves: { row: number; column: number }[] = [];

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
}
