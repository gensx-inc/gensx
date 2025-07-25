import { ChatWorkflow } from "./workflows.js";

const result = await ChatWorkflow(
  {
    userMessage:
      "Talk about AI developer tools and how important typescript will be for building agents.",
  },
  { printUrl: true },
);

console.info(result);
