import { Board } from "./Board.js";

export interface Game {
  playerX: Player;
  playerO: Player;
  board: Board;
}

export interface Player {
  model: string;
  strategy: string;
  provider: string;
}

export type PlayerSymbol = "X" | "O";
