import * as readline from "readline";

import * as gensx from "@gensx/core";
import { OpenAIProvider, OpenAIResponses } from "@gensx/openai";
import {
  Response,
  ResponseComputerToolCall,
} from "openai/resources/responses/responses";

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
}

const HumanFeedback = gensx.Component<HumanFeedbackProps, HumanFeedbackResult>(
  "HumanFeedback",
  async ({ assistantMessage }) => {
    console.log("\n🤖", assistantMessage);
    console.log("\n💬 Respond to the model (or type 'exit' to quit):");
    const userMessage = await getUserInput("");
    return { userMessage };
  },
);

interface ComputerUseSandboxProps {
  prompt: string;
}

const ComputerUseSandbox = gensx.Component<ComputerUseSandboxProps, Response>(
  "ComputerUseSandbox",
  ({ prompt }) => {
    return (
      <BrowserProvider initialUrl="https://bing.com">
        <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
          <OpenAIResponses
            model="computer-use-preview"
            tools={[
              {
                type: "computer_use_preview",
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
            {async (response: Response) => {
              let currentResponse = response;
              let computerCalls = currentResponse.output.filter(
                (item) => item.type === "computer_call",
              );

              while (true) {
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

                  // Take a screenshot after the action (function defined in step 4)
                  const context = gensx.useContext(BrowserContext);
                  if (!context.page) {
                    throw new Error("Browser page not found");
                  }
                  const screenshotBytes = await getScreenshot(context.page);
                  const screenshotBase64 =
                    Buffer.from(screenshotBytes).toString("base64");

                  currentResponse = (await OpenAIResponses.run({
                    model: "computer-use-preview",
                    previous_response_id: currentResponse.id,
                    tools: [
                      {
                        type: "computer_use_preview",
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
                          type: "input_image",
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

                // Get a response from the user to continue the conversation
                const { userMessage } = await HumanFeedback.run({
                  assistantMessage: currentResponse.output_text,
                });

                if (userMessage.toLowerCase() === "exit") {
                  break;
                }
                currentResponse = (await OpenAIResponses.run({
                  model: "computer-use-preview",
                  previous_response_id: currentResponse.id,
                  tools: [
                    {
                      type: "computer_use_preview",
                      display_width: 1024,
                      display_height: 768,
                      environment: "browser",
                    },
                  ],
                  input: [{ role: "user", content: userMessage }],
                  truncation: "auto",
                })) as Response;

                computerCalls = currentResponse.output.filter(
                  (item) => item.type === "computer_call",
                );
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
    //"add a good water bottle for ultra running to my cart on amazon. just pick one for me; please don't ask me questions",
    "help me browse the web";

  console.log(`\n🎯 PROMPT: ${prompt}`);
  const workflow = gensx.Workflow("ComputerUseWorkflow", ComputerUseSandbox);
  const result = await workflow.run({
    prompt,
  });
  console.log(`\n🤖: ${result.output_text}`);

  // Close readline interface when done
  rl.close();
}

main().catch(console.error);
