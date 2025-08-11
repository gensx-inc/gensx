import * as gensx from "@gensx/core";
import { generateText } from "@gensx/vercel-ai";
import { toolbox } from "../../shared/toolbox";
import { tool } from "ai";
import z from "zod";
import { anthropic } from "@ai-sdk/anthropic";

const analyzeScreenshot = gensx.Component("analyzeScreenshot", async ({
  tabId,
  selector,
  question
}: {
  tabId: number;
  selector: string;
  question: string;
}) => {
  const model = anthropic("claude-3-5-haiku-20241022");
  // const model = openai("gpt-5-nano-2025-08-07");

  try {
    // Capture screenshot using the external tool (same pattern as queryPage uses fetchPageText)
    console.log('Capturing screenshot for analysis:', { tabId, selector, question });

    const screenshotResult = await gensx.executeExternalTool(toolbox, "captureElementScreenshot", {
      tabId,
      selector,
      scrollIntoView: true
    });

    if (!screenshotResult.success || !screenshotResult.image) {
      return `Error capturing screenshot: ${screenshotResult.error || "Unknown error"}`;
    }

    console.log('Screenshot captured successfully, analyzing with multi-modal model');

    // Analyze the screenshot with the multi-modal model
    const result = await generateText({
      model,
      temperature: 1,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are analyzing a screenshot of a web page element to answer a specific question.

ELEMENT SELECTOR: ${selector}
QUESTION: ${question}
TAB ID: ${tabId}

Please analyze the screenshot and provide a detailed answer to the question. Focus on:
1. What you can see in the screenshot
2. Any visual patterns, layouts, or structures
3. Text content that's visible
4. UI elements and their purpose
5. How this relates to answering the specific question

Be specific and descriptive in your analysis.`
            },
            {
              type: 'image',
              image: screenshotResult.image
            }
          ]
        }
      ],
    });

    return result.text;

  } catch (error) {
    console.error('Screenshot analysis failed:', error);
    return `Screenshot analysis failed: ${error instanceof Error ? error.message : String(error)}`;
  }
});

export const analyzeScreenshotTool = tool({
  execute: async ({ tabId, selector, question }: { tabId: number; selector: string; question: string }) => {
    const result = await analyzeScreenshot({ tabId, selector, question });
    return result;
  },
  description: "Capture a screenshot of a specific element and answer a question about it.",
  parameters: z.object({
    tabId: z.number().describe("The ID of the tab containing the element"),
    selector: z.string().describe("CSS selector of the element to capture and analyze"),
    question: z.string().describe("The specific question to answer about the screenshot"),
  }),
});
