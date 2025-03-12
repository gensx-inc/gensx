import * as gensx from "@gensx/core";
import { OpenAIProvider, OpenAIResponses } from "@gensx/openai";
import { Response } from "openai/resources/responses/responses";
import { chromium, Page } from "playwright";

import { getScreenshot, handleModelAction } from "./computerUse.js";

interface ComputerUseSandboxProps {
  prompt: string;
  page: Page;
}

const ComputerUseSandbox = gensx.Component<ComputerUseSandboxProps, Response>(
  "ComputerUseSandbox",
  ({ prompt, page }) => {
    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <OpenAIResponses
          model="computer-use-preview"
          tools={[
            {
              type: "computer_use_preview",
              display_width: 1024,
              display_height: 768,
              environment: "browser", // other possible values: "mac", "windows", "ubuntu"
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

            while (computerCalls.length > 0) {
              // We expect at most one computer call per response.
              console.log("computerCalls", computerCalls);
              const computerCall = computerCalls[0];
              const lastCallId = computerCall.call_id;
              const action = computerCall.action;

              await handleModelAction(page, action);

              // Take a screenshot after the action (function defined in step 4)
              const screenshotBytes = await getScreenshot(page);
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
                    environment: "browser", // other possible values: "mac", "windows", "ubuntu"
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

            return currentResponse;
          }}
        </OpenAIResponses>
      </OpenAIProvider>
    );
  },
);

async function main() {
  console.log("\n🚀 Starting the responses API example");

  const browser = await chromium.launch({
    headless: false,
    chromiumSandbox: true,
    env: {},
    args: ["--disable-extensions", "--disable-file-system"],
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("https://bing.com");

  //await page.waitForTimeout(10000);

  console.log("\n🎯 Calling the OpenAI Responses API");
  const workflow = gensx.Workflow("ComputerUseWorkflow", ComputerUseSandbox);
  const result = await workflow.run({
    prompt: "Find Derek Legenzoff on LinkedIn.",
    page,
  });
  console.log(result.output_text);
}

main().catch(console.error);
