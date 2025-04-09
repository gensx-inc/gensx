import { DatabaseWorkflow } from "./workflows.js";

const result = await DatabaseWorkflow.run({});

console.log("Response:");
console.log(result);
