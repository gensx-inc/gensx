import {
  AnthropicProvider,
  ChatCompletion as ChatCompletionAnthropic,
} from "@gensx/anthropic";
import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx } from "gensx";
import { z } from "zod";

import { Board } from "./Board.js";
import { LLMPlayerStrategy, Move, Player } from "./types.js";

export interface MakeMoveProps {
  playerSymbol: "X" | "O";
  player: Player;
  board: Board;
}

export interface MakeMoveResult {
  move: Move;
  rawResponse: string;
  //reason: string;
  isFallback: boolean;
}

const MoveSchema = z.object({
  row: z.number().int().min(1).max(3),
  column: z.number().int().min(1).max(3),
});

export const getSystemMessage = (
  player: "X" | "O",
  strategy: LLMPlayerStrategy,
) => {
  const opponent = player === "X" ? "O" : "X";
  if (strategy === "thinking") {
    return `You are playing a game of Tic Tac Toe and are working hard to win the game. You are player \`${player}\` and your opponent is \`${opponent}\`.

Tic Tac Toe rules:
- The board is a 3x3 grid.
- Players take turns placing their pieces on the board.
- You can only place your piece in an empty square.
- You win if you can get 3 of your pieces in a row, column, or diagonal.
- The game is a draw if the board is full and no player has won.

You will be sent the board. You will respond with JSON in following format, that represents where you want to place your piece.
{
   "row": 1|2|3
   "column": 1|2|3
}

Before you make your move, talk through your strategy and figure out the best move to make. Then respond with the json inside of <move> xml tags (no backticks).`;
  } else {
    return `You are playing a game of Tic Tac Toe and are working hard to win the game. You are player \`${player}\` and your opponent is \`${opponent}\`.

Tic Tac Toe rules:
- The board is a 3x3 grid.
- Players take turns placing their pieces on the board.
- You can only place your piece in an empty square.
- You win if you can get 3 of your pieces in a row, column, or diagonal.
- The game is a draw if the board is full and no player has won.

You will be sent the board. You will respond with JSON in following format, that represents where you want to place your piece.
{
   "row": 1|2|3
   "column": 1|2|3
}

Please respond with the json inside of <move> xml tags (no backticks). Do not include any other text in the output.`;
  }
};

export const MakeMove = gsx.Component<MakeMoveProps, MakeMoveResult>(
  "MakeMove",
  async ({ playerSymbol, player, board }) => {
    if (player.type === "random") {
      return {
        move: board.getRandomMove()!,
        rawResponse: "N/A",
        isFallback: false,
      };
    } else if (player.type === "basic") {
      return {
        move: board.getBasicStrategyMove(playerSymbol)!,
        rawResponse: "N/A",
        isFallback: false,
      };
    } else {
      let response: string;
      if (player.provider?.type === "anthropic") {
        response = await gsx.execute<string>(
          <AnthropicProvider apiKey={player.provider.apiKey}>
            <ChatCompletionAnthropic
              model={player.model}
              system={getSystemMessage(playerSymbol, player.strategy)}
              max_tokens={1000}
              messages={[
                {
                  role: "user",
                  content: board.toString(),
                },
              ]}
            />
          </AnthropicProvider>,
        );
      } else {
        response = await gsx.execute<string>(
          <OpenAIProvider
            apiKey={player.provider?.apiKey}
            baseURL={player.provider?.baseURL}
          >
            <ChatCompletion
              model={player.model}
              messages={[
                {
                  role: "system",
                  content: getSystemMessage(playerSymbol, player.strategy),
                },
                { role: "user", content: board.toString() },
              ]}
            />
          </OpenAIProvider>,
        );
      }

      try {
        const moveText = /<move>(.*?)<\/move>/s.exec(response)?.[1];
        if (!moveText) {
          throw new Error("No move found in response");
        }

        const parsedJson = JSON.parse(moveText);
        // Rename column to col if it exists
        if (parsedJson.column && !parsedJson.column) {
          parsedJson.column = parsedJson.column;
          delete parsedJson.column;
        }

        // Validate and parse the move using the Zod schema
        const validatedMove = MoveSchema.parse(parsedJson);

        // Check the board to make sure the move is available
        const isValidMove = board.isValidMove(
          validatedMove.row,
          validatedMove.column,
        );
        if (!isValidMove) {
          throw new Error("Invalid move");
        }

        return {
          move: validatedMove,
          rawResponse: response,
          isFallback: false,
        };
      } catch {
        return {
          move: board.getRandomMove()!,
          rawResponse: response,
          isFallback: true,
        };
      }
    }
  },
);
