import { BasePlayer } from "./models/Player";
import { BasicPlayer } from "./players/BasicPlayer";
import { RandomPlayer } from "./players/RandomPlayer";
import { AnthropicPlayer } from "./players/AnthropicPlayer";
import { OpenAIPlayer } from "./players/OpenAIPlayer";
import { GooglePlayer } from "./players/GooglePlayer";
import { GrokPlayer } from "./players/GrokPlayer";
import { TogetherPlayer } from "./players/TogetherPlayer";
import { Strategy } from "./players/Prompt";
import * as readline from "readline";

export const availablePlayers = {
  "Basic Player": (name: string, symbol: "X" | "O") =>
    new BasicPlayer(name, symbol),
  "Random Player": (name: string, symbol: "X" | "O") =>
    new RandomPlayer(name, symbol),
  "Claude 3.5 Sonnet": (name: string, symbol: "X" | "O", strategy: Strategy) =>
    new AnthropicPlayer(name, symbol, "claude-3-5-sonnet-20241022", strategy),
  "Claude 3.5 Haiku": (name: string, symbol: "X" | "O", strategy: Strategy) =>
    new AnthropicPlayer(name, symbol, "claude-3-5-haiku-20241022", strategy),
  "GPT-4o": (name: string, symbol: "X" | "O", strategy: Strategy) =>
    new OpenAIPlayer(name, symbol, "gpt-4o-2024-11-20", strategy),
  "GPT-4o Mini": (name: string, symbol: "X" | "O", strategy: Strategy) =>
    new OpenAIPlayer(name, symbol, "gpt-4o-mini-2024-07-18", strategy),
  "Gemini Exp": (name: string, symbol: "X" | "O", strategy: Strategy) =>
    new GooglePlayer(name, symbol, "gemini-exp-1206", strategy),
  "Gemini Flash": (name: string, symbol: "X" | "O", strategy: Strategy) =>
    new GooglePlayer(name, symbol, "gemini-2.0-flash-exp", strategy),
  "Grok 2": (name: string, symbol: "X" | "O", strategy: Strategy) =>
    new GrokPlayer(name, symbol, "grok-2-1212", strategy),
  "Llama 3.3 70B": (name: string, symbol: "X" | "O", strategy: Strategy) =>
    new TogetherPlayer(
      name,
      symbol,
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      strategy
    ),
} as const;

export type PlayerKey = keyof typeof availablePlayers;

export const strategies: Strategy[] = [
  "basic",
  "thinking",
  "thinking-strategy",
];

export function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

export async function askQuestion(
  rl: readline.Interface,
  question: string
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

export async function selectStrategy(
  rl: readline.Interface
): Promise<Strategy> {
  console.log("\nSelect strategy:");
  strategies.forEach((strategy, index) => {
    console.log(`${index + 1}. ${strategy}`);
  });

  const strategyChoice = await askQuestion(
    rl,
    `Enter strategy (1-${strategies.length}): `
  );
  return strategies[parseInt(strategyChoice) - 1] || "thinking";
}

export async function selectPlayer(
  rl: readline.Interface,
  playerNumber: number,
  symbol: "X" | "O"
): Promise<BasePlayer> {
  console.log(`\nSelect player ${playerNumber} (${symbol}):`);
  const players = Object.keys(availablePlayers) as PlayerKey[];
  players.forEach((player, index) => {
    console.log(`${index + 1}. ${player}`);
  });

  const choice = await askQuestion(
    rl,
    `Enter your choice (1-${players.length}): `
  );
  const index = parseInt(choice) - 1;

  if (index >= 0 && index < players.length) {
    const selectedPlayer = players[index];
    const playerName = selectedPlayer;

    // Basic and Random players don't need strategy
    if (
      selectedPlayer === "Basic Player" ||
      selectedPlayer === "Random Player"
    ) {
      return availablePlayers[selectedPlayer](playerName, symbol);
    }

    // For AI players, ask for strategy
    const strategy = await selectStrategy(rl);
    return availablePlayers[selectedPlayer](playerName, symbol, strategy);
  }

  console.log("Invalid choice, defaulting to Basic Player");
  return new BasicPlayer("Basic Player", symbol);
}
