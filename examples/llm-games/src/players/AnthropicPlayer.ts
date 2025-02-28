import { Move, BaseLLMPlayer } from "../models/Player";
import { Board } from "../models/Board";
import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";
import { getSystemMessage, Strategy } from "./Prompt";
dotenv.config();

export class AnthropicPlayer extends BaseLLMPlayer {
  private anthropic: Anthropic;

  constructor(
    name: string,
    symbol: "X" | "O",
    model: string,
    strategy: Strategy
  ) {
    super(name, symbol, model, strategy);
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  public async getMove(board: Board, verbose: boolean = false): Promise<Move> {
    const systemMessage = getSystemMessage(this.symbol, this.strategy);
    try {
      const completion = await this.anthropic.messages.create({
        model: this.model,
        system: systemMessage,
        messages: [
          {
            role: "user",
            content: board.toString(),
          },
        ],
        max_tokens: 1024,
      });

      const response =
        completion.content[0].type === "text"
          ? completion.content[0].text
          : null;

      if (verbose) {
        console.log("\n", response, "\n");
      }

      const moveText = response?.match(/<move>(.*?)<\/move>/s)?.[1] || null;

      const move = JSON.parse(moveText || "");
      console.log(JSON.stringify(move, null, 2));

      return this.validateMove(move, board);
    } catch (error) {
      console.error(`Error getting move from Anthropic ${this.model}:`, error);
      return this.getFallbackMove(board);
    }
  }
}
