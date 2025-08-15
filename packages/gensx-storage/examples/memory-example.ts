/**
 * GenSX Memory Example
 * 
 * This example demonstrates the key features of the GenSX memory abstraction:
 * - Remembering different types of memories
 * - Recalling memories with various filters
 * - Attaching memory capabilities to agents
 */

import { createMemory } from "../src/memory/index.js";

// Example usage of GenSX Memory
async function memoryExample() {
  console.log("🧠 GenSX Memory Example\n");

  // 1. Create a memory instance with scope
  const memory = createMemory({
    scope: {
      workspaceId: "acme-corp",
      userId: "derek",
      agentId: "stylist-assistant",
      threadId: "conversation-123",
    },
    policy: {
      shortTerm: {
        tokenLimit: 4000,
        summarizeOverflow: true,
      },
      observability: {
        trace: true,
      },
    },
  });

  console.log("✅ Created memory instance with scoped namespace\n");

  // 2. Remember different types of memories
  console.log("📝 Storing memories...");

  // Semantic memory - durable facts/preferences
  await memory.remember({
    text: "Derek prefers navy ties and modern style clothing",
    type: "semantic",
    importance: "high",
    tags: ["preference", "style", "clothing"],
    source: "user_profile",
  });

  await memory.remember({
    text: "Client meetings are typically held on Tuesday mornings",
    type: "semantic", 
    importance: "medium",
    tags: ["schedule", "meetings"],
  });

  // Episodic memory - event log
  await memory.remember({
    text: "User searched for 'navy blue suits' and selected Italian wool option",
    type: "episodic",
    importance: "medium",
    tags: ["search", "selection", "suits"],
    source: "ui_interaction",
    attributes: {
      searchQuery: "navy blue suits",
      selectedOption: "italian_wool",
      timestamp: new Date().toISOString(),
    },
  });

  // Short-term memory - recent context
  await memory.remember({
    text: "Currently discussing outfit recommendations for upcoming client presentation",
    type: "shortTerm",
    importance: "high",
    tags: ["context", "presentation"],
  });

  console.log("✅ Stored 4 different memories\n");

  // 3. Recall memories with different strategies
  console.log("🔍 Recalling memories...");

  // Semantic search with query
  console.log("Semantic search for 'What style does Derek like?':");
  const styleMemories = await memory.recall({
    query: "What style does Derek like?",
    types: ["semantic"],
    limit: 3,
  });

  styleMemories.forEach((result, i) => {
    console.log(`  ${i + 1}. [Score: ${result.score.toFixed(3)}] ${result.item.text}`);
  });

  // Filter by tags
  console.log("\nMemories tagged with 'preference':");
  const preferenceMemories = await memory.recall({
    tags: ["preference"],
    limit: 5,
  });

  preferenceMemories.forEach((result, i) => {
    console.log(`  ${i + 1}. ${result.item.text}`);
  });

  // Recent episodic events
  console.log("\nRecent episodic memories:");
  const recentEvents = await memory.recall({
    types: ["episodic"],
    since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24h
    limit: 3,
  });

  recentEvents.forEach((result, i) => {
    console.log(`  ${i + 1}. ${result.item.text}`);
  });

  console.log("\n");

  // 4. Agent attachment example
  console.log("🤖 Demonstrating agent attachment...");

  // Mock agent function
  const stylistAgent = async (input: any) => {
    console.log(`  Agent received: ${JSON.stringify(input.message)}`);
    
    // Simulate agent processing
    if (input.message.toLowerCase().includes("recommend")) {
      return {
        recommendation: "Based on your preferences, I recommend a navy wool suit with a white dress shirt",
        confidence: 0.9,
      };
    }
    
    return {
      response: "I can help you with style recommendations. What are you looking for?",
      confidence: 0.7,
    };
  };

  // Attach memory capabilities
  const agentWithMemory = await memory.attach(stylistAgent, {
    preRecall: {
      limit: 3,
      types: ["semantic", "episodic"],
    },
    injectMode: "systemPreamble",
    postTurn: {
      logEpisodic: true,
      extractFacts: true,
    },
  });

  // Test the enhanced agent
  console.log("Calling agent with memory enhancement:");
  const response = await agentWithMemory({
    message: "Can you recommend an outfit for my client meeting?",
    systemMessage: "You are a professional stylist assistant.",
  });

  console.log(`  Agent response:`, response);
  console.log("\n");

  // 5. Demonstrate fact extraction
  console.log("🔎 Fact extraction example...");
  
  // Simulate a conversation that contains extractable facts
  const conversationInput = {
    message: "I have an important board meeting next Friday at 2 PM. I prefer formal attire and always wear black shoes to important meetings.",
  };
  
  const conversationOutput = {
    response: "I'll help you prepare a formal outfit. Black shoes are an excellent choice for board meetings.",
  };

  // The attach method automatically extracts facts, but let's show manual extraction
  const agentWithFactExtraction = await memory.attach(stylistAgent, {
    postTurn: {
      logEpisodic: true,
      extractFacts: true, // This will automatically extract and store facts
    },
  });

  await agentWithFactExtraction(conversationInput);
  
  console.log("✅ Facts automatically extracted and stored from conversation\n");

  // 6. Show final recall to see extracted facts
  console.log("📚 Final memory state - recent additions:");
  const finalMemories = await memory.recall({
    limit: 8,
  });

  finalMemories.forEach((result, i) => {
    const item = result.item;
    console.log(`  ${i + 1}. [${item.type}] ${item.text}`);
    if (item.tags?.length) {
      console.log(`      Tags: ${item.tags.join(", ")}`);
    }
  });

  console.log("\n🎉 Memory example completed!");
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  memoryExample().catch(console.error);
}

export { memoryExample };