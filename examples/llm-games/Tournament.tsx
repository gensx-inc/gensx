import * as gensx from "@gensx/core";

import { PlayGame } from "./Game.js";
import { Player } from "./types.js";

interface TournamentProps {
  players: Player[];
  numGames: number;
}

interface PlayerResult {
  wins: number;
  losses: number;
  draws: number;
  stats: {
    missedWins: number;
    missedBlocks: number;
    invalidMoves: number;
  };
}

interface TournamentOutput {
  results: Record<string, PlayerResult>;
}

export const PlayTournament = gensx.Component<
  TournamentProps,
  TournamentOutput
>("PlayTournament", async ({ players, numGames }) => {
  if (players.length !== 2) {
    throw new Error("Tournament requires exactly 2 players");
  }

  const player1 = players[0];
  const player2 = players[1];

  // Initialize results
  const results: Record<string, PlayerResult> = {
    [player1.name]: {
      wins: 0,
      losses: 0,
      draws: 0,
      stats: {
        missedWins: 0,
        missedBlocks: 0,
        invalidMoves: 0,
      },
    },
    [player2.name]: {
      wins: 0,
      losses: 0,
      draws: 0,
      stats: {
        missedWins: 0,
        missedBlocks: 0,
        invalidMoves: 0,
      },
    },
  };

  for (let i = 0; i < numGames; i++) {
    // Alternate who plays as X and O
    const isPlayer1X = i % 2 === 0;
    const playerX = isPlayer1X ? player1 : player2;
    const playerO = isPlayer1X ? player2 : player1;

    // Run the game
    const gameResult = await PlayGame.run({
      playerX,
      playerO,
      componentOpts: {
        name: `Game ${i + 1}`,
      },
    });

    // Track results
    if (gameResult.winner === "X") {
      // X won
      if (isPlayer1X) {
        results[player1.name].wins++;
        results[player2.name].losses++;
      } else {
        results[player2.name].wins++;
        results[player1.name].losses++;
      }
    } else if (gameResult.winner === "O") {
      // O won
      if (isPlayer1X) {
        results[player2.name].wins++;
        results[player1.name].losses++;
      } else {
        results[player1.name].wins++;
        results[player2.name].losses++;
      }
    } else {
      // Draw
      results[player1.name].draws++;
      results[player2.name].draws++;
    }

    // Track player stats
    if (isPlayer1X) {
      // Player 1 was X, player 2 was O
      results[player1.name].stats.missedWins +=
        gameResult.playerXStats.missedWins;
      results[player1.name].stats.missedBlocks +=
        gameResult.playerXStats.missedBlocks;
      results[player1.name].stats.invalidMoves +=
        gameResult.playerXStats.invalidMoves;

      results[player2.name].stats.missedWins +=
        gameResult.playerOStats.missedWins;
      results[player2.name].stats.missedBlocks +=
        gameResult.playerOStats.missedBlocks;
      results[player2.name].stats.invalidMoves +=
        gameResult.playerOStats.invalidMoves;
    } else {
      // Player 2 was X, player 1 was O
      results[player2.name].stats.missedWins +=
        gameResult.playerXStats.missedWins;
      results[player2.name].stats.missedBlocks +=
        gameResult.playerXStats.missedBlocks;
      results[player2.name].stats.invalidMoves +=
        gameResult.playerXStats.invalidMoves;

      results[player1.name].stats.missedWins +=
        gameResult.playerOStats.missedWins;
      results[player1.name].stats.missedBlocks +=
        gameResult.playerOStats.missedBlocks;
      results[player1.name].stats.invalidMoves +=
        gameResult.playerOStats.invalidMoves;
    }
  }

  return { results };
});
