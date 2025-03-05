import * as gensx from "@gensx/core";
import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
interface WriteTutorialProps {
  subject: string;
}

export const WriteTutorial = gensx.Component<WriteTutorialProps, string>(
  "WriteTutorial",
  ({ subject }) => {
    return (
      <ChatCompletion
        model="gpt-4o-mini"
        messages={[
          {
            role: "user",
            content: `Please write a short tutorial about ${subject}. Include code samples where appropriate.`,
          },
        ]}
      />
    );
  },
);

interface EditTutorialProps {
  tutorial: string;
}

export const EditTutorial = gensx.Component<EditTutorialProps, string>(
  "EditTutorial",
  ({ tutorial }) => {
    const prompt = `Please review the tutorial below, consider how to improve it, and then rewrite it.

    Consider the following:
    - Ensure the tutorial has an informative, interesting title
    - Ensure the tutorial is well-structured, with a logical flow and clear headings
    - Make sure the tutorial has an engaging introduction that hooks the reader and explains the what and why
    - Ensure the tutorial is written in a way that is easy to understand
    - Make sure the tutorial is engaging and interesting
    - Avoid complex language, jargon, and flowery language.

    <tutorial>
    ${tutorial}
    </tutorial>
    `;
    return (
      <ChatCompletion
        model="llama-3.3-70b-versatile"
        messages={[{ role: "user", content: prompt }]}
      />
    );
  },
);

const GroqProvider = gensx.Component<{}, never>("GroqProvider", () => (
  <OpenAIProvider
    apiKey={process.env.GROQ_API_KEY}
    baseURL="https://api.groq.com/openai/v1"
  />
));

export const WriteAndEditTutorial = gensx.Component<WriteTutorialProps, string>(
  "WriteAndEditTutorial",
  ({ subject }) => {
    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <WriteTutorial subject={subject}>
          {(tutorial) => {
            console.log("\n📝 Original tutorial from OpenAI:\n", tutorial);
            return (
              <GroqProvider>
                <EditTutorial tutorial={tutorial} />
              </GroqProvider>
            );
          }}
        </WriteTutorial>
      </OpenAIProvider>
    );
  },
);
