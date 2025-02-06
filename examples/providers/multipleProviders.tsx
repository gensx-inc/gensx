import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx, JSX } from "gensx";

interface PoemWriterProps {
  subject: string;
  type: "sonnet" | "haiku";
}

interface PoemWriterOutput {
  poem: string;
}

export const PoemWriter = gsx.Component<PoemWriterProps, PoemWriterOutput>(
  "PoemWriter",
  ({ subject, type }) => {
    return (
      <ChatCompletion
        model="gpt-4o-mini"
        messages={[
          {
            role: "user",
            content: `Please write a ${type} about ${subject}.`,
          },
        ]}
      />
    );
  },
);

interface StyleChangerProps {
  poem: string;
}

interface StyleChangerOutput {
  poem: string;
}

export const StyleChanger = gsx.Component<
  StyleChangerProps,
  StyleChangerOutput
>("StyleChanger", ({ poem }) => {
  const prompt = `Please rewrite the poem below in the voice of Yoda.

    <poem>
    ${poem}
    </poem>
    `;
  return (
    <ChatCompletion
      model="llama3-8b-8192"
      messages={[{ role: "user", content: prompt }]}
    />
  );
});

const GroqProvider = ({ children }: { children: JSX.Element }) => (
  <OpenAIProvider
    apiKey={process.env.GROQ_API_KEY}
    baseURL="https://api.groq.com/v1"
  >
    {children}
  </OpenAIProvider>
);

export const PoemWriterWithStyleChanger = gsx.Component<
  PoemWriterProps,
  PoemWriterOutput
>("PoemWriterWithStyleChanger", ({ subject, type }) => {
  return (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <PoemWriter subject={subject} type={type}>
        {({ poem }) => {
          return (
            <GroqProvider>
              <StyleChanger poem={poem} />
            </GroqProvider>
          );
        }}
      </PoemWriter>
    </OpenAIProvider>
  );
});
