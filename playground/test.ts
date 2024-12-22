import { main } from "./hackerNewsAnalyzer";

// Run with a smaller number of posts for testing
async function test() {
  try {
    console.log("Starting test with 5 posts...");
    await main();
    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

test();
