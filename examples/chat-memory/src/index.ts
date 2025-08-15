import { ChatMemoryWorkflow, MemoryDemoWorkflow } from "./workflows.js";

// Parse command line arguments
const command = process.argv[2] || "chat";
const threadId = process.argv[3] || "default-thread";
const userInput = process.argv[4] || "Hi there! Tell me something interesting about my thread.";

if (command === "demo") {
  console.log("🧠 Running GenSX Memory Demo...\n");
  
  const result = await MemoryDemoWorkflow({
    userId: "demo-user",
    threadId: "demo-thread",
  });
  
  console.log("\n📊 Demo Results:");
  console.log(`- Preferences stored: ${result.preferences}`);
  console.log(`- Discussions logged: ${result.discussions}`);
  console.log(`- Total memories: ${result.totalMemories}`);
} else {
  console.log(`💬 GenSX Chat with Memory`);
  console.log(`Using thread: ${threadId}`);
  console.log(`User input: ${userInput}\n`);

  const result = await ChatMemoryWorkflow({
    userInput,
    threadId,
    userId: "demo-user",
    useSmartMemory: true, // Use the smart memory approach by default
  });

  console.log("🤖 Assistant response:");
  console.log(result);
  
  console.log("\n💡 Try running again with the same thread ID to see memory in action!");
  console.log("💡 Or run 'pnpm dev demo' to see the memory demonstration");
}