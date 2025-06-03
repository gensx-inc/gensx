// Pure CommonJS usage of GenSX
const { Workflow } = require("@gensx/core");

const workflow = Workflow("CommonJSWorkflow", async ({ name }) => {
  return `Hello, ${name}! This message was generated using CommonJS.`;
});

workflow({ name: "World" }).then((result) => {
  console.log(result);
});
