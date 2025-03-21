import * as readline from "readline";

import * as gensx from "@gensx/core";
import { OpenAIProvider, OpenAIResponses } from "@gensx/openai";
import {
  Response,
  ResponseComputerToolCall,
} from "openai/resources/responses/responses";
import { Stream } from "openai/streaming.mjs";

import { BrowserContext, BrowserProvider } from "./browserContext.js";
import { getScreenshot, handleModelAction } from "./computerUse.js";

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promise-based function to get user input
function getUserInput(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

interface UseBrowserProps {
  call: ResponseComputerToolCall;
}

interface UseBrowserResult {
  currentUrl: string;
}

const UseBrowser = gensx.Component<UseBrowserProps, UseBrowserResult>(
  "UseBrowser",
  async ({ call }) => {
    const context = gensx.useContext(BrowserContext);
    if (!context.page) {
      throw new Error("Browser page not found");
    }
    let newPage = await handleModelAction(context.page, call.action);
    context.page = newPage;
    return { currentUrl: newPage.url() };
  },
);

interface HumanFeedbackProps {
  assistantMessage: string;
}

interface HumanFeedbackResult {
  userMessage: string;
  shouldExit: boolean;
}

const HumanFeedback = gensx.Component<HumanFeedbackProps, HumanFeedbackResult>(
  "HumanFeedback",
  async ({ assistantMessage }) => {
    console.log("\n🤖", assistantMessage);
    console.log("\n💬 Respond to the model (or type 'exit' to quit):");
    const userMessage = await getUserInput("");
    const shouldExit = userMessage.toLowerCase() === "exit";
    return { userMessage, shouldExit };
  },
);

interface ProcessComputerCallsProps {
  response: Response;
}

interface ProcessComputerCallsResult {
  updatedResponse: Response;
}

const ProcessComputerCalls = gensx.Component<
  ProcessComputerCallsProps,
  ProcessComputerCallsResult
>("ProcessComputerCalls", async ({ response }) => {
  let currentResponse = response;
  let computerCalls = currentResponse.output.filter(
    (item) => item.type === "computer_call",
  );

  while (computerCalls.length > 0) {
    // We expect at most one computer call per response.
    const computerCall = computerCalls[0];
    const lastCallId = computerCall.call_id;
    const action = computerCall.action;

    await UseBrowser.run({
      call: computerCall,
      componentOpts: {
        name: `[Browser]:${action.type}`,
      },
    });

    // Take a screenshot after the action
    const context = gensx.useContext(BrowserContext);
    if (!context.page) {
      throw new Error("Browser page not found");
    }
    const screenshotBytes = await getScreenshot(context.page);
    const screenshotBase64 = Buffer.from(screenshotBytes).toString("base64");

    currentResponse = (await OpenAIResponses.run({
      model: "computer-use-preview",
      previous_response_id: currentResponse.id,
      tools: [
        {
          // The types are wrong. Docs online and the JSDoc both say "computer_use_preview"
          type: "computer_use_preview" as unknown as "computer-preview",
          display_width: 1024,
          display_height: 768,
          environment: "browser",
        },
      ],
      input: [
        {
          call_id: lastCallId,
          type: "computer_call_output",
          output: {
            // The types are wrong. Docs online and the JSDoc both say "computer_screenshot"
            type: "input_image" as unknown as "computer_screenshot",
            image_url: `data:image/png;base64,${screenshotBase64}`,
          },
        },
      ],
      truncation: "auto",
    })) as Response;

    computerCalls = currentResponse.output.filter(
      (item) => item.type === "computer_call",
    );
  }

  return { updatedResponse: currentResponse };
});

interface ComputerUseExampleProps {
  prompt: string;
  allowHumanFeedback: boolean;
}

const ComputerUseExample = gensx.Component<ComputerUseExampleProps, Response>(
  "ComputerUseExample",
  ({ prompt, allowHumanFeedback }) => {
    return (
      <BrowserProvider initialUrl="https://bing.com">
        <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
          <OpenAIResponses
            model="computer-use-preview"
            tools={[
              {
                // The types are wrong. Docs online and the JSDoc both say "computer_use_preview"
                type: "computer_use_preview" as unknown as "computer-preview",
                display_width: 1024,
                display_height: 768,
                environment: "browser",
              },
            ]}
            input={[
              {
                role: "user",
                content: prompt,
              },
            ]}
            truncation="auto"
          >
            {async (response) => {
              // Satisfy the compiler
              if (response instanceof Stream) {
                return;
              }

              // Process initial response
              const { updatedResponse } = await ProcessComputerCalls.run({
                response,
              });

              // If human feedback is not allowed, return the response immediately
              if (!allowHumanFeedback) {
                return updatedResponse;
              }

              // Start conversation loop with human feedback
              let currentResponse = updatedResponse;
              let continueConversation = true;

              while (continueConversation) {
                // Get human feedback
                const { userMessage, shouldExit } = await HumanFeedback.run({
                  assistantMessage: currentResponse.output_text,
                });

                // Exit if requested
                if (shouldExit) {
                  continueConversation = false;
                  continue;
                }

                // Send user message to model
                const nextResponse = (await OpenAIResponses.run({
                  model: "computer-use-preview",
                  previous_response_id: currentResponse.id,
                  tools: [
                    {
                      // The types are wrong. Docs online and the JSDoc both say "computer_use_preview"
                      type: "computer_use_preview" as unknown as "computer-preview",
                      display_width: 1024,
                      display_height: 768,
                      environment: "browser",
                    },
                  ],
                  input: [{ role: "user", content: userMessage }],
                  truncation: "auto",
                })) as Response;

                // Process any computer calls in the response
                const { updatedResponse: processedResponse } =
                  await ProcessComputerCalls.run({
                    response: nextResponse,
                  });

                currentResponse = processedResponse;
              }

              return currentResponse;
            }}
          </OpenAIResponses>
        </OpenAIProvider>
      </BrowserProvider>
    );
  },
);

async function main() {
  console.log("\n🚀 Starting the computer use example");

  const prompt =
    "how long does it take to drive from seattle to portland? use google maps";

  console.log(`\n🎯 PROMPT: ${prompt}`);
  const workflow = gensx.Workflow("ComputerUseWorkflow", ComputerUseExample);
  const result = await workflow.run({
    prompt,
    allowHumanFeedback: false,
  });
  console.log("✅ Computer use complete");
  console.log(`\n✨ Final response: ${result.output_text}`);

  rl.close();
}

main().catch(console.error);
