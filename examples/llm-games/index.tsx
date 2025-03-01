import { gsx } from "gensx";

import { PlayTournament } from "./Tournament.js";
import { Player } from "./types.js";
async function main() {
  const player1: Player = new Player({
    model: "gpt-4o-mini",
    type: "llm",
    provider: "openai",
  });
  const player2: Player = new Player({
    type: "basic",
  });

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
    players: [player1, player2],
    numGames: 4,
  });
  console.log(result);
}
main().catch(console.error);
