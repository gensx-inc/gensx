import { GetModelHistoryAcrossProviders } from "./workflows.js";

const prompt = process.argv[2] ?? "Why is the ocean salty?";

console.log("Processing prompt:", prompt);

const result = await GetModelHistoryAcrossProviders({ prompt });

for (const [provider, responses] of Object.entries(result)) {
  console.log(`\nProvider: ${provider}`);
  for (const [modelName, response] of Object.entries(responses)) {
    console.log(`\n--- ${modelName} ---`);
    console.log(response);
  }
}
