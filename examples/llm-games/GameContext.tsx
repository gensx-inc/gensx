import { gsx } from "gensx";

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

// Create a context with a default value
export const GameContext = gsx.createContext<Game>({
  playerX: {
    model: "",
    strategy: "",
    provider: "",
  },
  playerO: {
    model: "",
    strategy: "",
    provider: "",
  },
  board: new Board(),
});
