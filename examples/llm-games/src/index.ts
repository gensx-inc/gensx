import { Game } from "./Game";
import { createReadlineInterface, selectPlayer, askQuestion } from "./utils";
import Logger from "./utils/logger";

type PlayerStats = {
  wins: number;
  losses: number;
  draws: number;
};

type GameStats = {
  [key: string]: PlayerStats;
};

type PerformanceStats = {
  invalidMoves: number;
  missedWins: number;
  missedBlocks: number;
};

type CumulativeStats = {
  [key: string]: PerformanceStats;
};

async function main() {
  console.log("Welcome to Tic Tac Toe Tournament!");

  // Initialize logging session and print info
  const { sessionId, logsDir } = Logger.getSessionInfo();
  console.log(`\nLogging session started: ${sessionId}`);
  console.log(`Logs will be saved to: ${logsDir}`);

  const rl = createReadlineInterface();

  // Get number of games
  const numGamesStr = await askQuestion(rl, "\nNumber of games: ");
  const NUM_GAMES = Math.max(1, parseInt(numGamesStr) || 5);

  // Select players
  const player1 = await selectPlayer(rl, 1, "X");
  const player2 = await selectPlayer(rl, 2, "O");

  rl.close();

  const stats: GameStats = {
    [player1.getName()]: { wins: 0, losses: 0, draws: 0 },
    [player2.getName()]: { wins: 0, losses: 0, draws: 0 },
  };

  const cumulativeStats: CumulativeStats = {
    [player1.getName()]: { invalidMoves: 0, missedWins: 0, missedBlocks: 0 },
    [player2.getName()]: { invalidMoves: 0, missedWins: 0, missedBlocks: 0 },
  };

  for (let i = 0; i < NUM_GAMES; i++) {
    console.log(`\nGame ${i + 1} of ${NUM_GAMES}`);
    // Alternate who goes first
    const isEvenGame = i % 2 === 0;

    // Create new players with correct symbols for this game
    const firstPlayer = isEvenGame
      ? new (player1.constructor as any)(
          player1.getName(),
          "X",
          (player1 as any).model,
          (player1 as any).strategy
        )
      : new (player2.constructor as any)(
          player2.getName(),
          "X",
          (player2 as any).model,
          (player2 as any).strategy
        );

    const secondPlayer = isEvenGame
      ? new (player2.constructor as any)(
          player2.getName(),
          "O",
          (player2 as any).model,
          (player2 as any).strategy
        )
      : new (player1.constructor as any)(
          player1.getName(),
          "O",
          (player1 as any).model,
          (player1 as any).strategy
        );

    console.log(
      `${firstPlayer.getName()} (X) vs ${secondPlayer.getName()} (O)`
    );

    const game = new Game(firstPlayer, secondPlayer);
    const { result, stats: gameStats } = await game.play();
    console.log(result);

    // Log tournament game results
    const winner = result.includes("wins") ? result.split(" wins")[0] : null;
    const isDraw = result.includes("draw");
    Logger.logTournamentGame(
      game.getGameId(),
      firstPlayer.getName(),
      secondPlayer.getName(),
      winner,
      isDraw,
      gameStats
    );

    // Update statistics
    if (result.includes("wins")) {
      const winner = result.split(" wins")[0];
      if (winner === player1.getName() || winner === player2.getName()) {
        stats[winner].wins++;
        stats[
          winner === player1.getName() ? player2.getName() : player1.getName()
        ].losses++;
      }
    } else {
      stats[player1.getName()].draws++;
      stats[player2.getName()].draws++;
    }

    // Update cumulative performance stats
    for (const playerName of [player1.getName(), player2.getName()]) {
      const playerStats = gameStats.getPlayerStats(playerName);
      if (playerStats) {
        cumulativeStats[playerName].invalidMoves += playerStats.invalidMoves;
        cumulativeStats[playerName].missedWins += playerStats.missedWins;
        cumulativeStats[playerName].missedBlocks += playerStats.missedBlocks;
      }
    }
  }

  // Print final statistics
  console.log("\nTournament Results:");
  for (const [playerName, record] of Object.entries(stats)) {
    console.log(
      `${playerName}: ${record.wins} wins, ${record.losses} losses, ${record.draws} draws`
    );
  }

  // Print overall tournament statistics
  const totalGames = NUM_GAMES;
  const totalDraws = stats[player1.getName()].draws; // draws are same for both players
  const drawPercentage = ((totalDraws / totalGames) * 100).toFixed(1);
  const decisiveGames = totalGames - totalDraws;

  console.log("\nOverall Tournament Statistics:");
  console.log(`Total Games Played: ${totalGames}`);
  console.log(
    `Decisive Games: ${decisiveGames} (${(
      (decisiveGames / totalGames) *
      100
    ).toFixed(1)}%)`
  );
  console.log(`Draws: ${totalDraws} (${drawPercentage}%)`);

  // Print cumulative performance stats
  console.log("\nCumulative Performance Stats:");
  for (const [playerName, stats] of Object.entries(cumulativeStats)) {
    console.log(`\n${playerName}:`);
    console.log(`  Invalid Moves: ${stats.invalidMoves}`);
    console.log(`  Missed Wins: ${stats.missedWins}`);
    console.log(`  Missed Blocks: ${stats.missedBlocks}`);
  }
}

main().catch(console.error);
