import { Board } from "./Board.js";

export interface Game {
  playerX: Player;
  playerO: Player;
  board: Board;
}

export interface Move {
  row: number;
  column: number;
}

export class Player {
  model?: string;
  provider?: string;
  type: PlayerType;
  name: string;
  constructor(
    {
      model,
      provider,
      type = "basic",
    }: {
      model?: string;
      provider?: string;
      type: PlayerType;
    } = { type: "basic" },
  ) {
    this.model = model;
    this.provider = provider;
    this.type = type;
    this.name = this.model ?? this.type;

    // Validate that LLM players have required properties
    if (this.type === "llm") {
      if (!this.provider) {
        throw new Error("LLM players must have a provider specified");
      }
      if (!this.model) {
        throw new Error("LLM players must have a model specified");
      }
    }
  }
}

export type PlayerSymbol = "X" | "O";

export type PlayerType = "llm" | "basic" | "random";
