import { Move, BaseLLMPlayer } from "../models/Player";
import { Board } from "../models/Board";
import * as dotenv from "dotenv";
import { getSystemMessage, Strategy } from "./Prompt";
import { Together } from "together-ai";
dotenv.config();

export type TogetherModel =
  | "meta-llama/Llama-3.1-405B-Instruct-Turbo"
  | "meta-llama/Llama-3.3-70B-Instruct-Turbo"
  | "deepseek-ai/DeepSeek-V3"
  | "Qwen/Qwen2.5-72B-Instruct-Turbo";

export class TogetherPlayer extends BaseLLMPlayer {
  private together: Together;

  constructor(
    name: string,
    symbol: "X" | "O",
    model: TogetherModel,
    strategy: Strategy
  ) {
    super(name, symbol, model, strategy);
    this.together = new Together({
      apiKey: process.env.TOGETHER_API_KEY,
    });
  }

  private async getTogetherResponse(
    board: Board
  ): Promise<Together.Chat.Completions.ChatCompletion> {
    const systemMessage = getSystemMessage(this.symbol, this.strategy);
    let stop: string[] = [];

    if (
      this.model === "meta-llama/Llama-3.1-405B-Instruct-Turbo" ||
      this.model === "meta-llama/Llama-3.3-70B-Instruct-Turbo"
    ) {
      stop = ["<|eot_id|>", "<|eom_id|>"];
    } else if (this.model === "deepseek-ai/DeepSeek-V3") {
      stop = ["<｜end▁of▁sentence｜>"];
    } else if (this.model === "Qwen/Qwen2.5-72B-Instruct-Turbo") {
      stop = ["<|im_end|>"];
    }

    return this.together.chat.completions.create({
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
      max_tokens: 1024,
      stop: stop,
    });
  }

  public async getMove(board: Board, verbose: boolean = false): Promise<Move> {
    const systemMessage = getSystemMessage(this.symbol, this.strategy);
    try {
      const completion = await this.getTogetherResponse(board);

      if (verbose) {
        console.log("\n", completion.choices[0].message?.content, "\n");
      }

      const moveText =
        completion.choices[0].message?.content?.match(
          /<move>(.*?)<\/move>/s
        )?.[1];

      const move = JSON.parse(moveText || "");

      return this.validateMove(move, board);
    } catch (error) {
      console.error(`Error getting move from Together ${this.model}:`, error);
      return this.getFallbackMove(board);
    }
  }
}
