import { Board } from "./Board";
import { Strategy } from "../players/Prompt";

export interface Move {
  row: number;
  column: number;
  isFallback?: boolean;
}

export interface Player {
  getMove(board: Board): Promise<Move>;
  getName(): string;
  getSymbol(): "X" | "O";
}

// Base class for all players (LLM and non-LLM)
export abstract class BasePlayer implements Player {
  protected name: string;
  protected symbol: "X" | "O";

  constructor(name: string, symbol: "X" | "O") {
    this.name = name;
    this.symbol = symbol;
  }

  public abstract getMove(board: Board): Promise<Move>;

  public getName(): string {
    return this.name;
  }

  public getSymbol(): "X" | "O" {
    return this.symbol;
  }

  protected getAvailableMoves(board: Board): Move[] {
    const availableMoves: Move[] = [];
    const grid = board.getGrid();
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (grid[i][j] === "") {
          availableMoves.push({ row: i + 1, column: j + 1 });
        }
      }
    }
    return availableMoves;
  }
}

// Base class specifically for LLM-based players
export abstract class BaseLLMPlayer extends BasePlayer {
  protected model: string;
  protected strategy: Strategy;

  constructor(
    name: string,
    symbol: "X" | "O",
    model: string,
    strategy: Strategy
  ) {
    super(name, symbol);
    this.model = model;
    this.strategy = strategy;
  }

  protected getFallbackMove(board: Board): Move {
    console.log("\n----\nInvalid Move :(\n----\n");
    const availableMoves = this.getAvailableMoves(board);
    if (availableMoves.length === 0) {
      throw new Error("No valid moves available");
    }
    return { ...availableMoves[0], isFallback: true };
  }

  protected validateMove(
    move: { row: number; column: number },
    board: Board
  ): Move {
    const { row, column } = move;
    if (isNaN(row) || isNaN(column) || !board.isValidMove(row, column)) {
      return this.getFallbackMove(board);
    }
    return { row, column, isFallback: false };
  }
}
