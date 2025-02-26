import { execSync } from "child_process";

import { GSXTool } from "@gensx/openai";
import { z } from "zod";

// Define the schema as a Zod object
const bashToolSchema = z.object({
  command: z.string().describe("The bash command to run."),
});

// Use z.infer to get the type for our parameters
type BashToolParams = z.infer<typeof bashToolSchema>;

// Centralized logging function
function logError(context: string, error: unknown) {
  console.error(`❌ ${context}`, error);
  if (error instanceof Error) {
    console.error(error.stack);
  }
}

// Retry function with exponential backoff
async function retryOperation(operation: () => Promise<any>, retries: number = 3, delay: number = 500): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i < retries - 1) {
        console.log(`Retrying operation, attempt ${i + 1}`);
        await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
      } else {
        throw error;
      }
    }
  }
}

// Create the tool with the correct type - using the schema type, not the inferred type
export const bashTool = new GSXTool<typeof bashToolSchema>({
  name: "bash",
  description: `Run commands in a bash shell\n
* When invoking this tool, the contents of the \"command\" parameter does NOT need to be XML-escaped.\n
* You don't have access to the internet via this tool.\n
* You do have access to a mirror of common linux and python packages via apt and pip.\n
* State is persistent across command calls and discussions with the user.\n
* To inspect a particular line range of a file, e.g. lines 10-25, try 'sed -n 10,25p /path/to/the/file'.\n
* Please avoid commands that may produce a very large amount of output.\n
* Please run long lived commands in the background, e.g. 'sleep 10 &' or start a server in the background.`,
  schema: bashToolSchema,
  run: async ({ command }: BashToolParams) => {
    console.log(`💻 Executing BashTool command: ${command}`);
    try {
      const result = await retryOperation(() => Promise.resolve(execSync(command)));
      console.log(`🎉 BashTool command executed successfully.`);
      return result.toString();
    } catch (error) {
      logError(`Error executing BashTool command: ${command}`, error);
      // Check if error is an object with stderr property
      if (error && typeof error === "object" && "stderr" in error) {
        return (error.stderr as Buffer).toString();
      }
      // Fallback to error message if available
      if (error instanceof Error) {
        return error.message;
      }
      return "An unknown error occurred";
    }
  },
});
