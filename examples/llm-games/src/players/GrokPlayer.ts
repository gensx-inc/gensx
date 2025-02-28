import { Move, BaseLLMPlayer } from "../models/Player";
import { Board } from "../models/Board";
import OpenAI from "openai";
import * as dotenv from "dotenv";
import { getSystemMessage, Strategy } from "./Prompt";
dotenv.config();

export class GrokPlayer extends BaseLLMPlayer {
  private grok: OpenAI;

  constructor(
    name: string,
    symbol: "X" | "O",
    model: string,
    strategy: Strategy
  ) {
    super(name, symbol, model, strategy);
    this.grok = new OpenAI({
      apiKey: process.env.GROK_API_KEY,
      baseURL: "https://api.x.ai/v1",
    });
  }

  public async getMove(board: Board, verbose: boolean = false): Promise<Move> {
    const systemMessage = getSystemMessage(this.symbol, this.strategy);
    try {
      const completion = await this.grok.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
          {
            role: "user",
            content: board.toString(),
          },
        ],
      });

      if (verbose) {
        console.log("\n", completion.choices[0].message.content, "\n");
      }

      const moveText =
        completion.choices[0].message.content?.match(
          /<move>(.*?)<\/move>/s
        )?.[1];

      const move = JSON.parse(moveText || "");
      console.log(JSON.stringify(move, null, 2));

      return this.validateMove(move, board);
    } catch (error) {
      console.error(`Error getting move from Grok ${this.model}:`, error);
      return this.getFallbackMove(board);
    }
  }
}
