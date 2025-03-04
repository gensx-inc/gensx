import { Board } from "./Board.js";

export interface Game {
  playerX: Player;
  playerO: Player;
  board: Board;
}

export interface Provider {
  apiKey: string;
  baseURL?: string;
}

export interface Move {
  row: number;
  column: number;
}

export class Player {
  model?: string;
  provider?: Provider;
  strategy: LLMPlayerStrategy;
  type: PlayerType;
  name: string;
  constructor(
    {
      model,
      provider,
      type = "basic",
      strategy = "basic",
    }: {
      model?: string;
      provider?: Provider;
      type: PlayerType;
      strategy?: LLMPlayerStrategy;
    } = { type: "basic" },
  ) {
    this.model = model;
    this.provider = provider;
    this.type = type;
    this.name = this.model ?? this.type;
    this.strategy = strategy;

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

export type LLMPlayerStrategy = "basic" | "thinking";
