import { openai } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import { generateObject, generateText } from "@gensx/vercel-ai";
import { z } from "zod";

import { Reflection, ReflectionOutput } from "./reflection.js";

const openaiModel = openai("gpt-4o-mini");

const ImproveText = gensx.Component(
  "ImproveText",
  async ({
    input,
    feedback,
  }: {
    input: string;
    feedback: string;
  }): Promise<string> => {
    console.log("\n📝 Current draft:\n", input);
    console.log("\n🔍 Feedback:\n", feedback);
    console.log("=".repeat(50));
    const systemPrompt = `You're a helpful assistant that improves text by fixing typos, removing buzzwords, jargon, and making the writing sound more authentic.

    You will be given a piece of text and feedback on the text. Your job is to improve the text based on the feedback. You should return the improved text and nothing else.`;
    const prompt = `<feedback>
    ${feedback}
    </feedback>

    <text>
    ${input}
    </text>`;
    const result = await generateText({
      model: openaiModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });
    return result.text;
  },
);

const EvaluateText = gensx.Component(
  "EvaluateText",
  async ({ input }: { input: string }): Promise<ReflectionOutput> => {
    const systemPrompt = `You're a helpful assistant that evaluates text and suggests improvements if needed.

    ## Evaluation Criteria

    - Check for genuine language: flag any buzzwords, corporate jargon, or empty phrases like "cutting-edge solutions"
    - Look for clear, natural expression: mark instances of flowery language or clichéd openers like "In today's landscape..."
    - Review word choice: highlight where simpler alternatives could replace complex or technical terms
    - Assess authenticity: note when writing tries to "sell" rather than inform clearly and factually
    - Evaluate tone: identify where the writing becomes overly formal instead of warm and conversational
    - Consider flow and engagement - flag where transitions feel choppy or content becomes dry and predictable


    ## Output Format
    Return your response as JSON with the following two properties:

    - feedback: A string describing the improvements that can be made to the text. Return feedback as short bullet points. If no improvements are needed, return an empty string.
    - continueProcessing: A boolean indicating whether the text should be improved further. If no improvements are needed, return false.

    You will be given a piece of text. Your job is to evaluate the text and return a JSON object with the following format:
    {
      "feedback": "string",
      "continueProcessing": "boolean"
    }
    `;
    const result = await generateObject({
      model: openaiModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input },
      ],
      schema: z.object({
        feedback: z.string(),
        continueProcessing: z.boolean(),
      }),
    });
    return result.object;
  },
);

export const ImproveTextWithReflection = gensx.Workflow(
  "ImproveTextWithReflection",
  async ({ text }: { text: string }): Promise<string> => {
    return Reflection({
      input: text,
      ImproveFn: ImproveText,
      EvaluateFn: EvaluateText,
      maxIterations: 3,
    });
  },
);
