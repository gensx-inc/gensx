import fs from "fs/promises";

import * as gensx from "@gensx/core";

import { PlayTournament } from "./Tournament.js";
import { Player } from "./types.js";
async function main() {
  const player1: Player = new Player({
    model: "claude-3-7-sonnet-latest",
    type: "llm",
    strategy: "thinking",
    provider: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      type: "anthropic",
    },
  });
  // const player1: Player = new Player({
  //   model: "deepseek/deepseek-r1",
  //   type: "llm",
  //   strategy: "basic",
  //   provider: {
  //     apiKey: process.env.OPENROUTER_API_KEY!,
  //     baseURL: "https://openrouter.ai/api/v1",
  //     type: "openai",
  //   },
  // });
  // const player1: Player = new Player({
  //   type: "random",
  // });
  const player2: Player = new Player({
    type: "basic",
  });

  // Play a single game
  // const gameWorkflow = gensx.Workflow("TicTacToe", PlayGame);
  // const result = await gameWorkflow.run({ playerX, playerO });
  // console.log(result);

  // Play a tournament
  const tournamentWorkflow = gensx.Workflow(
    "TicTacToeTournament",
    PlayTournament,
  );

  const numGames = 100;
  const result = await tournamentWorkflow.run({
    players: [player1, player2],
    numGames,
  });
  console.log(result);

  // Write results to JSONL file
  const filename = "tournament_results.jsonl";

  // Create a record for each game with timestamp
  const resultEntry = {
    timestamp: new Date().toISOString(),
    players: {
      player1: player1.name,
      player1Strategy: player1.strategy,
      player2: player2.name,
      player2Strategy: player2.strategy,
    },
    numGames,
    results: result.results,
  };

  await fs.appendFile(filename, JSON.stringify(resultEntry) + "\n");
  console.log(`Results appended to ${filename}`);
}
main().catch(console.error);
