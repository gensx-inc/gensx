import { gsx } from "gensx";

import { PlayTournament } from "./Tournament.js";
import { Player } from "./types.js";
async function main() {
  const playerX: Player = {
    model: "gpt-4o-mini",
    strategy: "random",
    provider: "openai",
  };
  const playerO: Player = {
    model: "gpt-4o",
    strategy: "random",
    provider: "openai",
  };

  // Play a single game
  // const gameWorkflow = gsx.Workflow("TicTacToe", PlayGame);
  // const result = await gameWorkflow.run({ playerX, playerO });
  // console.log(result);

  // Play a tournament
  const tournamentWorkflow = gsx.Workflow(
    "TicTacToeTournament",
    PlayTournament,
  );
  const result = await tournamentWorkflow.run({
    players: [playerX, playerO],
    numGames: 4,
  });
  console.log(result);
}
main().catch(console.error);
