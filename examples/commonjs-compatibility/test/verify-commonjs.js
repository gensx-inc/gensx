// Test script to verify CommonJS compatibility
const assert = require("assert");

// Import the main function from our CommonJS example
const main = require("../dist/cjs-jsx.js");

async function runTest() {
  try {
    // Expected results from our workflow
    const expectedResults = [
      "Hello, World! This message was generated using CommonJS + JSX.",
      "Hello, CommonJS! This message was generated using CommonJS + JSX.",
    ];

    // Run the workflow and get results directly
    const actualResults = await main();

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
