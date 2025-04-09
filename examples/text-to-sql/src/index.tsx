import { SQLiteWorkflow } from "./workflows.js";

const result = await SQLiteWorkflow.run({});

console.log("Response:");
console.log(result);
