import { gsx } from "@gensx/core";
import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { ClientOptions } from "openai";

interface ProviderConfig {
  clientOptions: ClientOptions;
  model: string;
}

interface SummarizeDocumentProps {
  document: string;
  provider: ProviderConfig;
}

const SummarizeDocument = gsx.Component<SummarizeDocumentProps, string>(
  "SummarizeDocument",
  ({ document, provider }) => (
    <OpenAIProvider {...provider.clientOptions}>
      <ChatCompletion
        model={provider.model}
        messages={[
          {
            role: "user",
            content: `Please create a high level summary of the following document targeting 30 words:\n\n <document>${document}</document>`,
          },
        ]}
      />
    </OpenAIProvider>
  ),
);

interface ExtractKeywordsProps {
  document: string;
  provider: ProviderConfig;
}

const ExtractKeywords = gsx.Component<ExtractKeywordsProps, string[]>(
  "ExtractKeywords",
  ({ document, provider }) => (
    <OpenAIProvider {...provider.clientOptions}>
      <ChatCompletion
        model={provider.model}
        messages={[
          {
            role: "user",
            content: `Please return a comma separated list of key words from the following document:

            <document>${document}</document>

            Aim for 5-10 keywords. Do not include any other text in your response besides the list of keywords.`,
          },
        ]}
      >
        {(response) => response.split(",").map((phrase) => phrase.trim())}
      </ChatCompletion>
    </OpenAIProvider>
  ),
);

interface CategorizeDocumentProps {
  document: string;
  provider: ProviderConfig;
}

const CategorizeDocument = gsx.Component<CategorizeDocumentProps, string>(
  "CategorizeDocument",
  ({ document, provider }) => (
    <OpenAIProvider {...provider.clientOptions}>
      <ChatCompletion
        model={provider.model}
        messages={[
          {
            role: "user",
            content: `Please analyze the following document and return a category for it. The category should be one of the following: 'technology', 'business', 'science', 'health', 'politics', 'entertainment', 'other'.

            <document>${document}</document>

            Do not include any other text in your response besides the category.`,
          },
        ]}
      />
    </OpenAIProvider>
  ),
);

interface ProcessDocumentProps {
  document: string;
  defaultProvider: ProviderConfig;
  smallModelProvider?: ProviderConfig;
}

export interface ProcessDocumentOutput {
  summary: string;
  keywords: string[];
  category: string;
}

export const ProcessDocument = gsx.Component<
  ProcessDocumentProps,
  ProcessDocumentOutput
>("ProcessDocument", (props) => {
  const smallModelProvider = props.smallModelProvider ?? props.defaultProvider;
  return {
    summary: (
      <SummarizeDocument
        document={props.document}
        provider={props.defaultProvider}
      />
    ),
    keywords: [
      <ExtractKeywords
        document={props.document}
        provider={smallModelProvider}
      />,
    ],
    category: (
      <CategorizeDocument
        document={props.document}
        provider={smallModelProvider}
      />
    ),
  };
});
