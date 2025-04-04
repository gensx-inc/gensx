import path from "path";

import * as gensx from "@gensx/core";
import { OpenAIProvider } from "@gensx/openai";
import { BlobProvider, useBlob } from "@gensx/storage";

// Define our own chat message type structure that is compatible with OpenAI's API
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Main chat component that uses memory
const TestMemory = gensx.Component<{ id: string }, string>(
  "TestMemory",
  (props) => {
    const { id } = props;

    // Use a string return value directly
    const run = async (): Promise<string> => {
      try {
        // Test JSON
        const blob = useBlob<ChatMessage[]>(`${id}-json`);
        await blob.putJSON([{ role: "user", content: "Hello world" }]);

        const history = await blob.getJSON();
        console.log("JSON response: ", history);

        // Test string
        const blob2 = useBlob<string>(`${id}-string`);
        await blob2.putString("Hello world");
        const string = await blob2.getString();
        console.log("String response: ", string);

        // Test metadata
        const blob3 = useBlob<string>(`${id}-metadata`);
        await blob3.putString("Hello world", {
          metadata: {
            test: "test",
          },
        });

        const metadata = await blob3.getMetadata();
        console.log("Metadata response: ", metadata);

        // Update metadata
        await blob3.updateMetadata({
          test: "test2",
        });

        const metadata2 = await blob3.getMetadata();
        console.log("Updated metadata response: ", metadata2);

        // Delete the blob
        await blob3.delete();
        const exists = await blob3.exists();
        console.log("Exists response: ", exists);

        // Test raw
        const blob4 = useBlob<Buffer>(`${id}-raw`);
        await blob4.putRaw(Buffer.from("Hello world"), {
          metadata: {
            test: "test",
          },
        });

        const raw = await blob4.getRaw();
        console.log("Raw response: ", raw);
        return "We made it!";
      } catch (error) {
        console.error("Error in chat processing:", error);
        return `Error processing your request in thread ${id}. Please try again.`;
      }
    };

    return run();
  },
);

// Main workflow component
const WorkflowComponent = gensx.Component<{ id: string }, string>(
  "Workflow",
  ({ id }) => (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <>
        <BlobProvider
          //kind="filesystem"
          //rootDir={path.join(process.cwd(), "chat-memory")}
          kind="cloud"
          //region="us-west-2"
          //bucket="gensx-chat-history"
        >
          <TestMemory id={id} />
        </BlobProvider>
        <BlobProvider
          kind="filesystem"
          rootDir={path.join(process.cwd(), "chat-memory")}
          //kind="cloud"
          //region="us-west-2"
          //bucket="gensx-chat-history"
        >
          <TestMemory id={`${id}-fs`} />
        </BlobProvider>
      </>
    </OpenAIProvider>
  ),
);

// Create the workflow
const TestMemoryWorkflow = gensx.Workflow(
  "TestMemoryWorkflow",
  WorkflowComponent,
);

// Run the workflow with a specific thread ID
const id = process.argv[2] || "default-thread";

console.log(`Using thread: ${id}`);
//       pulumi env run ai-dev -- pnpm dev test1
const result = await TestMemoryWorkflow.run(
  {
    id,
  },
  { printUrl: true },
);

console.log("\nAssistant response:");
console.log(result);
