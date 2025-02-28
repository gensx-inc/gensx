import { Game } from "./Game";
import { availablePlayers } from "./utils";
import Logger from "./utils/logger";
import type { PlayerKey } from "./utils";
import { Strategy } from "./players/Prompt";

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

async function evaluatePlayer(
  playerKey: PlayerKey,
  strategy: Strategy,
  numGames: number,
  stats: GameStats,
  cumulativeStats: CumulativeStats
) {
  const playerName = playerKey;
  const basicPlayerName = "Basic Player";

  // Initialize stats if not exists
  if (!stats[playerName]) {
    stats[playerName] = { wins: 0, losses: 0, draws: 0 };
  }
  if (!stats[basicPlayerName]) {
    stats[basicPlayerName] = { wins: 0, losses: 0, draws: 0 };
  }
  if (!cumulativeStats[playerName]) {
    cumulativeStats[playerName] = {
      invalidMoves: 0,
      missedWins: 0,
      missedBlocks: 0,
    };
  }
  if (!cumulativeStats[basicPlayerName]) {
    cumulativeStats[basicPlayerName] = {
      invalidMoves: 0,
      missedWins: 0,
      missedBlocks: 0,
    };
  }

  for (let i = 0; i < numGames; i++) {
    // Alternate who goes first
    const isEvenGame = i % 2 === 0;
    const aiPlayer = availablePlayers[playerKey](
      playerName,
      isEvenGame ? "X" : "O",
      strategy
    );
    const basicPlayer = availablePlayers["Basic Player"](
      basicPlayerName,
      isEvenGame ? "O" : "X"
    );

    const firstPlayer = isEvenGame ? aiPlayer : basicPlayer;
    const secondPlayer = isEvenGame ? basicPlayer : aiPlayer;

    console.log(
      `\nGame ${
        i + 1
      }/${numGames}: ${firstPlayer.getName()} (${firstPlayer.getSymbol()}) vs ${secondPlayer.getName()} (${secondPlayer.getSymbol()})`
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
    if (winner) {
      stats[winner].wins++;
      stats[winner === playerName ? basicPlayerName : playerName].losses++;
    } else {
      stats[playerName].draws++;
      stats[basicPlayerName].draws++;
    }

    // Update cumulative performance stats
    for (const name of [playerName, basicPlayerName]) {
      const playerStats = gameStats.getPlayerStats(name);
      if (playerStats) {
        cumulativeStats[name].invalidMoves += playerStats.invalidMoves;
        cumulativeStats[name].missedWins += playerStats.missedWins;
        cumulativeStats[name].missedBlocks += playerStats.missedBlocks;
      }
    }
  }
}

async function main() {
  console.log("Welcome to Tic Tac Toe Model Evaluation!");

  // Initialize logging session and print info
  const { sessionId, logsDir } = Logger.getSessionInfo();
  console.log(`\nLogging session started: ${sessionId}`);
  console.log(`Logs will be saved to: ${logsDir}`);

  const NUM_GAMES = 10; // Number of games per player/strategy combination

  // Get all AI players (excluding Basic and Random players)
  const aiPlayers = Object.keys(availablePlayers).filter(
    (player) => player !== "Basic Player" && player !== "Random Player"
  ) as PlayerKey[];

  const stats: GameStats = {};
  const cumulativeStats: CumulativeStats = {};

  // Test each AI player with basic strategy
  for (const player of aiPlayers) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`Evaluating ${player}`);
    console.log("=".repeat(50));

    await evaluatePlayer(player, "basic", NUM_GAMES, stats, cumulativeStats);

    // Print intermediate results for this player
    const netWins = stats[player].wins - stats[player].losses;
    console.log(`\nResults for ${player}:`);
    console.log(
      `Wins: ${stats[player].wins}, Losses: ${stats[player].losses}, Draws: ${stats[player].draws} (Net Wins: ${netWins})`
    );
    console.log("Performance Stats:");
    console.log(`Invalid Moves: ${cumulativeStats[player].invalidMoves}`);
    console.log(`Missed Wins: ${cumulativeStats[player].missedWins}`);
    console.log(`Missed Blocks: ${cumulativeStats[player].missedBlocks}`);
  }

  // Print final statistics
  console.log("\nFinal Tournament Results:");
  for (const [playerName, record] of Object.entries(stats)) {
    const netWins = record.wins - record.losses;
    console.log(
      `${playerName}: ${record.wins} wins, ${record.losses} losses, ${record.draws} draws (Net Wins: ${netWins})`
    );
  }

  // Print performance statistics
  console.log("\nPerformance Statistics:");
  for (const [playerName, stats] of Object.entries(cumulativeStats)) {
    console.log(`\n${playerName}:`);
    console.log(`  Invalid Moves: ${stats.invalidMoves}`);
    console.log(`  Missed Wins: ${stats.missedWins}`);
    console.log(`  Missed Blocks: ${stats.missedBlocks}`);
  }
}

main().catch(console.error);
