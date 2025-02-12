import { createInterface } from "readline";

import { GSXTool } from "@gensx/openai";
import { z } from "zod";

// Define the schema as a Zod object
const confirmationToolSchema = z.object({
  action: z.string().describe("The action to be confirmed by the user."),
  details: z
    .string()
    .describe(
      "Additional details about the action to help the user make a decision.",
    ),
});

// Use z.infer to get the type for our parameters
//type ConfirmationToolParams = z.infer<typeof confirmationToolSchema>;

// Create readline interface for console input/output
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to ask question and get response
const askQuestion = (question: string): Promise<string> => {
  console.log(question);
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
};

// Create the tool with the correct type
export const confirmationTool = new GSXTool<typeof confirmationToolSchema>(
  "confirmation",
  `Tool to get user confirmation before proceeding with actions.\n
* Returns "yes" if the user approves the action\n
* Returns "no" if the user denies the action\n
* The action should be a clear, concise description of what will happen\n
* The details should provide any relevant additional information to help the user decide`,
  confirmationToolSchema,
  async ({ action, details }) => {
    console.log("\n=== Confirmation Required ===");
    console.log(`Action: ${action}`);
    console.log(`Details: ${details}`);

    let response = "";
    while (response !== "yes" && response !== "no") {
      response = await askQuestion("\nDo you approve this action? (yes/no): ");
      if (response !== "yes" && response !== "no") {
        console.log('Please answer with "yes" or "no"');
      }
    }

    return response;
  },
);
