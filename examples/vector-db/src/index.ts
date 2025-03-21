import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import testCases from "./nulang_tests.json" with { type: "json" };
import { LoadDocsWorkflow, NuLangTranslatorWorkflow } from "./workflows.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // if the vector db is not created, assume we need to load the docs
  if (!fs.existsSync(path.join(__dirname, "providers", ".vectors", "docs"))) {
    console.info("Loading docs...");
    await LoadDocsWorkflow.run({
      dir: path.join(__dirname, "..", "nulang_docs"),
    });
    console.info("Docs loaded!");
  }

  let passed = 0;

  for (const [i, test] of testCases.entries()) {
    const output = await NuLangTranslatorWorkflow.run({
      query: `Translate this phrase. Don't output anything else besides the translation: ${test.input}`,
    });
    const isMatch = output.trim() === test.expected.trim();

    console.log(`Test ${i + 1}: ${test.input}`);
    console.log(`→ Expected: ${test.expected}`);
    console.log(`→ Received: ${output}`);
    console.log(isMatch ? "✅ Passed\n" : "❌ Failed\n");

    if (isMatch) passed++;
  }

  console.log(`Summary: ${passed}/${testCases.length} passed`);
}

await main();
