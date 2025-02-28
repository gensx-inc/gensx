import { gsx } from "gensx";

import { PlayGame } from "./Game.js";
import { Player } from "./GameContext.js";
async function main() {
  const playerX: Player = {
    model: "gpt-4o-mini",
    strategy: "random",
    provider: "openai",
  };
  const playerO: Player = {
    model: "gpt-4o-mini",
    strategy: "random",
    provider: "openai",
  };

  const gameWorkflow = gsx.Workflow("TicTacToe", PlayGame);
  const result = await gameWorkflow.run({ playerX, playerO });
  console.log(result);
}
main().catch(console.error);
