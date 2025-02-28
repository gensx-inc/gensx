import { Move, BaseLLMPlayer } from "../models/Player";
import { Board } from "../models/Board";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import { getSystemMessage, Strategy } from "./Prompt";
dotenv.config();

// gemini-exp-1206
// gemini-2.0-flash-exp

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 10000; // 10 seconds

export class GooglePlayer extends BaseLLMPlayer {
  private google: GoogleGenerativeAI;

  constructor(
    name: string,
    symbol: "X" | "O",
    model: string,
    strategy: Strategy
  ) {
    super(name, symbol, model, strategy);
    this.google = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt > MAX_RETRIES) {
        throw error;
      }

      const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempt - 1); // 10, 20, 40 seconds
      console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
      await this.delay(delayMs);

      return this.retryWithBackoff(operation, attempt + 1);
    }
  }

  public async getMove(board: Board): Promise<Move> {
    const systemMessage = getSystemMessage(this.symbol, this.strategy);
    const modelProvider = this.google.getGenerativeModel({
      model: this.model,
      systemInstruction: systemMessage,
    });

    try {
      const result = await this.retryWithBackoff(async () => {
        return modelProvider.generateContent(board.toString());
      });

      const moveText = result.response
        .text()
        .match(/<move>(.*?)<\/move>/s)?.[1];

      const move = JSON.parse(moveText || "");
      console.log(JSON.stringify(move, null, 2));

      return this.validateMove(move, board);
    } catch (error) {
      console.error(
        `Error getting move from Google ${this.model} after ${MAX_RETRIES} retries:`,
        error
      );
      return this.getFallbackMove(board);
    }
  }
}
