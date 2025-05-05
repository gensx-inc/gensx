import { WriteBlogWorkflow } from "./workflows.js";

const prompt = process.argv[2] || "Write a blog post about the future of AI";

async function main() {
  console.log("\n🚀 Starting blog writing workflow");
  console.log(`Prompt: ${prompt}`);

  const stream = await WriteBlogWorkflow.run(
    {
      stream: true,
      prompt,
    },
    { printUrl: true },
  );
  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }
  console.log("\n✅ Blog writing complete");
}

main().catch(console.error);
