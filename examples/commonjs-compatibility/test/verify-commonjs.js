// Test script to verify CommonJS compatibility
const assert = require("node:assert");

// Import the main function from our CommonJS example
const main = require("../dist/workflow.js");

async function runTest() {
  try {
    // Expected results from our workflow
    const expectedResults = ">>>>>>>HELLO, WORLD!";

    // Run the workflow and get results directly
    const actualResults = await main({ input: "Hello, world!" });

    // Verify the results match exactly
    assert.deepStrictEqual(
      actualResults,
      expectedResults,
      "Results do not match expected output",
    );

    console.log("✓ CommonJS compatibility test passed");
  } catch (err) {
    console.error("Test failed:", err);
    throw err;
  }
}

// Run the test
runTest();
