import { Move, BasePlayer } from "../models/Player";
import { Board } from "../models/Board";

export class RandomPlayer extends BasePlayer {
  constructor(name: string, symbol: "X" | "O") {
    super(name, symbol);
  }

  public async getMove(board: Board): Promise<Move> {
    const availableMoves = this.getAvailableMoves(board);
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }
}
