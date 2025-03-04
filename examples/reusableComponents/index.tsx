import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import * as gensx from "@gensx/core";

import { ProcessDocument } from "./reusableComponents.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const gpt4oProviderConfig = {
    clientOptions: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    model: "gpt-4o",
  };

  const llama8bProviderConfig = {
    clientOptions: {
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    },
    model: "llama-3.1-8b-instant",
  };

  const document = fs.readFileSync(
    path.join(__dirname, "data", "markov-chains.md"),
    "utf8",
  );

  const workflow = gensx.Workflow("ProcessDocumentWorkflow", ProcessDocument);
  const documentMetadata = await workflow.run({
    document,
    defaultProvider: gpt4oProviderConfig,
    smallModelProvider: llama8bProviderConfig,
  });

  console.log(documentMetadata);
}

main().catch(console.error);
