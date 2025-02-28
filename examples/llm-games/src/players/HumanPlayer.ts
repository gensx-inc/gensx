import { Player, Move } from "../models/Player";
import { Board } from "../models/Board";
import * as readline from "readline";
import { askQuestion } from "../utils";
export class HumanPlayer implements Player {
  private name: string;
  private symbol: "X" | "O";
  private rl: readline.Interface;

  constructor(name: string, symbol: "X" | "O", rl: readline.Interface) {
    this.name = name;
    this.symbol = symbol;
    this.rl = rl;
  }

  public async getMove(board: Board): Promise<Move> {
    console.log(board.toString());

    while (true) {
      console.log("\n" + "=".repeat(50));
      console.log("Make your move!:");
      console.log("=".repeat(50));
      const row = await askQuestion(this.rl, "Enter row (1-3): ");
      const col = await askQuestion(this.rl, "Enter column (1-3): ");

      const rowNum = parseInt(row);
      const colNum = parseInt(col);

      if (
        isNaN(rowNum) ||
        isNaN(colNum) ||
        !board.isValidMove(rowNum, colNum)
      ) {
        console.log("Invalid move! Try again.");
        continue;
      }

      return { row: rowNum, column: colNum };
    }
  }

  public getName(): string {
    return this.name;
  }

  public getSymbol(): "X" | "O" {
    return this.symbol;
  }
}
