import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx } from "gensx";
import { z } from "zod";

import { Board } from "./Board.js";
import { Move, Player } from "./types.js";

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

export const getBasicSystemMessage = (player: "X" | "O") => {
  const opponent = player === "X" ? "O" : "X";
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
};

export const MakeMove = gsx.Component<MakeMoveProps, MakeMoveResult>(
  "MakeMove",
  ({ playerSymbol, player, board }) => {
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
      return (
        <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
          <ChatCompletion
            model={player.model}
            messages={[
              { role: "system", content: getBasicSystemMessage(playerSymbol) },
              { role: "user", content: board.toString() },
            ]}
          >
            {(response: string) => {
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

                return {
                  move: validatedMove,
                  rawResponse: response,
                  isFallback: false,
                };
              } catch {
                return {
                  move: board.getRandomMove(),
                  rawResponse: response,
                  isFallback: true,
                };
              }
            }}
          </ChatCompletion>
        </OpenAIProvider>
      );
    }
  },
);
