import { Component } from "../packages/gensx-core/src/index.js";

// Simple component that processes text
const TextProcessor = Component<{ text: string }, string>(
  "TextProcessor",
  ({ text }) => {
    return text.toUpperCase();
  },
);

// Component that counts words in a text
const WordCounter = Component<{ text: string }, number>(
  "WordCounter",
  ({ text }) => {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  },
);

// Component that generates a summary
const Summarizer = Component<{ text: string }, string>(
  "Summarizer",
  ({ text }) => {
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    const wordCount = words.length;
    return `Summary: ${wordCount} words. Preview: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`;
  },
);

// Component that checks if text is long or short
const TextClassifier = Component<
  { text: string },
  { classification: string; length: number }
>("TextClassifier", ({ text }) => {
  const length = text.length;
  const classification = length > 100 ? "long" : "short";
  return { classification, length };
});

async function runWorkflow() {
  console.log("=== GenSX Fluent API Example ===");

  // Sample text for our workflow
  const sampleText =
    "This is an example text for demonstrating the GenSX fluent API. " +
    "The fluent API allows for method chaining, making it easier to create complex workflows " +
    "without using JSX syntax. Features include piping, branching, forking and joining execution paths.";

  console.log("Input text:", sampleText);
  console.log("\n=== Sequential Execution ===");

  // 1. Simple sequential execution
  const processedText = await TextProcessor.run({ text: sampleText });
  console.log("Processed text:", processedText);

  // 2. Method chaining with pipe
  console.log("\n=== Piping Example ===");
  const result = await TextProcessor.pipe((text) =>
    WordCounter.run({ text }),
  ).run({ text: sampleText });

  console.log("Word count from piping:", result);

  // 3. Branching based on condition
  console.log("\n=== Branching Example ===");
  const branchResult = await TextClassifier.branch(
    (result) => result.classification === "long",
    (result) => Summarizer.run({ text: sampleText }),
    (result) =>
      `Short text, no summarization needed: ${result.length} characters`,
  ).run({ text: sampleText });

  console.log("Branch result:", branchResult);

  // 4. Fork and join
  console.log("\n=== Fork/Join Example ===");
  const parallelResult = await TextProcessor.fork(
    (text) => WordCounter.run({ text }),
    (text) => TextClassifier.run({ text }),
    (text) => Summarizer.run({ text }),
  )
    .join((wordCount, classification, summary) => ({
      wordCount,
      classification,
      summary,
    }))
    .run({ text: sampleText });

  console.log("Parallel execution results:");
  console.log("- Word count:", parallelResult.wordCount);
  console.log("- Classification:", parallelResult.classification);
  console.log("- Summary:", parallelResult.summary);
}

// Run the workflow
runWorkflow().catch(console.error);
