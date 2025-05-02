import { Component, createProvider } from "@gensx/core";
import { ChatCompletion, OpenAIProvider } from "@gensx/openai";

// Simple component that echoes the input
const EchoComponent = Component<{ input: string }, string>(
  "EchoComponent",
  ({ input }) => input,
);

// Component with AI that enhances an input text
const EnhanceText = Component<{ text: string }, string>(
  "EnhanceText",
  ({ text }) => {
    return ChatCompletion.run({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: `Please enhance this text: ${text}` },
      ],
      model: "gpt-4o",
      temperature: 0.7,
    });
  },
);

// Combined workflow using the fluent API
const workflow = async (input: string) => {
  // Create a provider
  const provider = createProvider(
    OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
  );

  // Method 1: Sequential execution with await
  const result1 = await provider.with(async () => {
    const echo = await EchoComponent.run({ input });
    const enhanced = await EnhanceText.run({ text: echo });
    return { original: echo, enhanced };
  });

  // Method 2: Using the fluent API with chaining
  const result2 = await EchoComponent.props({ input })
    .pipe((echo) =>
      EnhanceText.props({ text: echo }).pipe((enhanced) => ({
        original: echo,
        enhanced,
      })),
    )
    .withProvider(provider)
    .run();

  console.log("Result 1:", result1);
  console.log("Result 2:", result2);

  // Method 3: Using pipe chaining with branching
  const result3 = await EchoComponent.props({ input })
    .branch(
      (text) => text.length > 10, // Condition
      (text) =>
        EnhanceText.props({ text }).pipe((enhanced) => ({
          original: text,
          enhanced,
          note: "Text was long enough to enhance",
        })),
      (text) => ({
        original: text,
        enhanced: text.toUpperCase(),
        note: "Text was too short to enhance",
      }),
    )
    .withProvider(provider)
    .run();

  console.log("Result 3:", result3);

  return { result1, result2, result3 };
};

// Export the workflow
export { workflow };
