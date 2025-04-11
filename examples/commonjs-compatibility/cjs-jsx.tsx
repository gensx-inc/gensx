// JSX example that will be compiled to CommonJS
import { Component, Workflow } from "@gensx/core";

// Confirm we're using CommonJS at runtime
console.log("Module type: CommonJS");

// Create a simple component that uses props
const Greeter = Component<{ name: string }, string>("Greeter", (props) => {
  return `Hello, ${props.name}! This message was generated using CommonJS + JSX.`;
});

// Create a component that composes other components using JSX
const App = Component<Record<string, never>, string[]>("App", async () => {
  return [
    await Greeter.run({ name: "World" }),
    await Greeter.run({ name: "CommonJS" }),
  ];
});

// Run the example
async function main() {
  console.log("Running workflow...");
  const workflow = Workflow("CommonJSWorkflow", App);
  const results = await workflow.run({});
  console.log("Results:", results);
  return results;
}

// Export for testing
module.exports = main;
