import { Game } from "./Game";
import {
  createReadlineInterface,
  askQuestion,
  availablePlayers,
  strategies,
} from "./utils";
import { HumanPlayer } from "./players/HumanPlayer";
import type { PlayerKey } from "./utils";

async function main() {
  const rl = createReadlineInterface();

  while (true) {
    try {
      console.log("Welcome to Tic Tac Toe!\n");
      console.log("=".repeat(50));
      console.log("Available AI players:");
      console.log("=".repeat(50));
      Object.keys(availablePlayers).forEach((player, index) => {
        console.log(`${index + 1}. ${player}`);
      });

      const playerChoice = await askQuestion(
        rl,
        "\nChoose your opponent (enter number 1-" +
          Object.keys(availablePlayers).length +
          "): "
      );
      const playerIndex = parseInt(playerChoice) - 1;

      if (
        isNaN(playerIndex) ||
        playerIndex < 0 ||
        playerIndex >= Object.keys(availablePlayers).length
      ) {
        console.log(
          "\nPlease enter a valid number between 1 and " +
            Object.keys(availablePlayers).length
        );
        continue;
      }

      const playerKey = Object.keys(availablePlayers)[playerIndex] as PlayerKey;
      console.log("\n\n" + "=".repeat(50));
      console.log("Available strategies:");
      console.log("=".repeat(50));

      strategies.forEach((strategy, index) => {
        console.log(`${index + 1}. ${strategy}`);
      });

      const strategyChoice = await askQuestion(
        rl,
        "\nChoose strategy (enter number 1-" + strategies.length + "): "
      );
      const strategyIndex = parseInt(strategyChoice) - 1;

      if (
        isNaN(strategyIndex) ||
        strategyIndex < 0 ||
        strategyIndex >= strategies.length
      ) {
        console.log(
          "\nPlease enter a valid number between 1 and " + strategies.length
        );
        continue;
      }

      const strategy = strategies[strategyIndex];

      const humanGoFirst =
        (
          await askQuestion(rl, "\nDo you want to go first? (y/n): ")
        ).toLowerCase() === "y";

      const human = new HumanPlayer("Human", humanGoFirst ? "X" : "O", rl);
      const ai = availablePlayers[playerKey](
        playerKey,
        humanGoFirst ? "O" : "X",
        strategy
      );

      const game = new Game(
        humanGoFirst ? human : ai,
        humanGoFirst ? ai : human
      );

      const result = await game.play();
      console.log("\n" + "=".repeat(50));
      console.log("Game Result: " + result.result);
      console.log("=".repeat(50));

      console.log("\n" + result.stats.getStats());
      break;
    } catch (error) {
      console.error("An error occurred:", error);
      console.log("\nLet's try again...\n");
    }
  }

  rl.close();
}

main().catch(console.error);
