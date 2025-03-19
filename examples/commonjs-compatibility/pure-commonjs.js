// Pure CommonJS example without TypeScript
const gensx = require("@gensx/core");

// Confirm we're using CommonJS
console.log(
  "Module type:",
  typeof module !== "undefined" ? "CommonJS" : "ES Module",
);

// Create a simple component that just returns text
function createSimpleComponent() {
  return gensx.Component("SimpleCommonJSExample", () => {
    return "This is a simple CommonJS component that demonstrates the dual package support!";
  });
}

// Run the example
async function main() {
  try {
    const Example = createSimpleComponent();
    const workflow = gensx.Workflow("SimpleCommonJSWorkflow", Example);

    const result = await workflow.run();
    console.log(result);
  } catch (error) {
    console.error("Error running example:", error);
  }
}

main().catch(console.error);
