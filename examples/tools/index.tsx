import { gsx } from "gensx";
import { z } from "zod";

// Define a simple echo tool that just returns what you pass in
const EchoSchema = z.object({
  message: z.string().describe("The message to echo back"),
});

type EchoParams = z.infer<typeof EchoSchema>;

const EchoTool = gsx.Tool<typeof EchoSchema, string>({
  name: "echo",
  description: "Echoes back the message you send",
  schema: EchoSchema,
  function: async (params: EchoParams) => {
    console.log("Echo tool called with:", params);
    return `Echo: ${params.message}`;
  },
});

async function main() {
  console.log("\n🔊 Testing echo tool...");

  // Test direct function call
  const result1 = await EchoTool({ message: "Hello direct!" });
  console.log("Direct call result:", result1);

  // Test JSX usage
  const result2 = await gsx.execute(<EchoTool message="Hello JSX!" />);
  console.log("JSX call result:", result2);

  // Log the OpenAPI schema
  //console.log("\nTool schema:", EchoTool.getOpenApiSchema());
}

main().catch(console.error);
