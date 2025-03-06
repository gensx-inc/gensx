"use client";

import { CodeBlock } from "@/components/ui/code-block";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { HyperText } from "@/components/ui/hyper-text";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Home() {
  type ExampleType = "components" | "workflows" | "agents" | "llms";

  // State that remains when you click an example
  const [committedExample, setCommittedExample] =
    useState<ExampleType>("components");
  // Temporary state that updates on hover (overriding the committed one temporarily).
  const [hoveredExample, setHoveredExample] = useState<ExampleType | null>(
    null,
  );
  // The active example is the hovered one (if one exists) or the committed one.
  const activeExample = hoveredExample ?? committedExample;

  const examples: Record<ExampleType, string> = {
    components: `import * as gensx from 'gensx';
import { ChatCompletion } from 'gensx/openai';

interface WriteDraftProps {
  research: string[];
  prompt: string;
}

const WriteDraft = gensx.Component<WriteDraftProps, string>(
  "WriteDraft",
  ({ prompt, research }) => {
    const systemMessage = \`You're an expert technical writer.
    Use the information when responding to users: \${research}\`;

    return (
      <ChatCompletion
        model="gpt-4o-mini"
        temperature={0}
        messages={[
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: \`Write a blog post about \${prompt}\`
          },
        ]}
      />
    );
  },
);
`,
    workflows: `import * as gensx from 'gensx';
import { OpenAIProvider } from 'gensx/openai';
import { Research, WriteDraft, EditDraft } from './writeBlog';

interface BlogWriterProps {
  prompt: string;
}

export const WriteBlog = gensx.StreamComponent<BlogWriterProps>(
  "WriteBlog",
  ({ prompt }) => {
    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <Research prompt={prompt}>
          {(research) => (
            <WriteDraft prompt={prompt} research={research.flat()}>
              {(draft) => <EditDraft draft={draft} stream={true} />}
            </WriteDraft>
          )}
        </Research>
      </OpenAIProvider>
    );
  },
);

const workflow = gensx.Workflow("WriteBlogWorkflow", WriteBlog);
const result = await workflow.run({
  prompt: "Write a blog post about AI developer tools"
});
`,
    agents: `import * as gensx from 'gensx';
import { OpenAIProvider, GSXTool, GSXChatCompletion } from 'gensx/openai';

const webSearchTool = new GSXTool({
  name: "web_search",
  description: "Search the internet for information",
  schema: webSearchSchema,
  run: async ({ query }: WebSearchParams) => {
    return await searchWeb(query);
  },
});

const WebSearchAgent = gensx.Component<{}, Stream<ChatCompletionChunk>>(
  "WebSearchAgent",
  () => (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <GSXChatCompletion
        stream={true}
        messages={[
          {
            role: "system",
            content: "You are a sassy, trash eating racoon.",
          },
          {
            role: "user",
            content: "Where are the best trash cans near central park?",
          },
        ]}
        model="gpt-4o-mini"
        temperature={0.7}
        tools={[webSearchTool]}
      />
    </OpenAIProvider>
  ),
);`,
    llms: `import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import * as gensx from "@gensx/core";
import { ClientOptions } from "openai";

const grok3Config = {
  clientOptions: {
    apiKey: process.env.GROK_API_KEY,
    baseURL: "https://api.x.ai/v1",
  },
  model: "grok-3",
};

const DocumentSummarizer = gensx.Component<DocumentSummarizerProps, string>(
  "DocumentSummarizer",
  ({ document, provider }) => (
    <OpenAIProvider {...provider.clientOptions}>
      <ChatCompletion
        model={provider.model}
        messages={[
          {
            role: "user",
            content: \`Summarize the document in 30 words: \${document}\`,
          },
        ]}
      />
    </OpenAIProvider>
  ),
);

const workflow = gensx.Workflow(
  "DocumentSummarizerWorkflow",
  DocumentSummarizer,
);

const result = await workflow.run({
  document: "The quick brown fox...",
  provider: grok3Config,
});
`,
  };

  // Define an array of button/tab details so we can map over them.
  const examplesData: {
    type: ExampleType;
    title: string;
    description: string;
    mobileTitle: string;
  }[] = [
    {
      type: "components",
      title: "Create Components",
      mobileTitle: "Create Components",
      description:
        "Create building blocks for your app with reusable components.",
    },
    {
      type: "workflows",
      title: "Run Workflows",
      mobileTitle: "Run Workflows",
      description: "Combine components to build and run powerful workflows.",
    },
    {
      type: "agents",
      title: "Build Agents",
      mobileTitle: "Build Agents",
      description: "Create agents to handle complex tasks.",
    },
    {
      type: "llms",
      title: "Use any LLM",
      mobileTitle: "Use any LLM",
      description: "Easily swap between models and providers.",
    },
  ];

  return (
    <div className="min-h-screen">
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col gap-4 items-center w-full max-w-7xl mx-auto pt-24 px-4 md:px-8 pb-20 mt-0 md:mt-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.0, ease: "easeOut" }}
          className="max-w-4xl mx-auto flex flex-col items-center text-center"
        >
          <h1 className="text-2xl md:text-6xl font-bold text-center">
            The TypeScript framework for agents & workflows
          </h1>
          <p className="max-w-2xl text-md md:text-xl text-gray-600 mt-6 leading-relaxed text-center">
            Build complex AI applications with React-like components.
          </p>
          <div className="flex gap-4 mt-8 justify-center">
            <Link href="/docs/quickstart">
              <Button variant="primary">
                <div className="flex items-center">
                  <span>
                    <HyperText delay={650} startOnView={false}>
                      Start Building
                    </HyperText>
                  </span>
                  <ArrowUpRight className="ml-2 w-4 h-4" />
                </div>
              </Button>
            </Link>
          </div>
          {/* <ScriptCopyBtnDemo /> */}
        </motion.div>

        {/* Example Picker Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="w-full max-w-5xl mx-auto mt-12"
        >
          {/* <div className="text-xl font-bold text-center mx-auto mb-4 w-[500px]">
            If you can build a React component, you should be able to build an
            AI agent or workflow...
          </div> */}
          {/* Mobile Picker */}
          <div className="block md:hidden">
            <div className="flex gap-0 relative">
              {examplesData.map(({ type, mobileTitle }) => (
                <button
                  key={type}
                  onClick={() => setCommittedExample(type)}
                  onMouseEnter={() => setHoveredExample(type)}
                  onMouseLeave={() => {
                    setCommittedExample(type);
                    setHoveredExample(null);
                  }}
                  className={`flex-1 px-4 py-2 text-sm font-medium text-center border transition-colors relative group ${
                    activeExample === type
                      ? "bg-transparent border-transparent"
                      : "bg-white hover:bg-[#ffe066]/10"
                  }`}
                >
                  {/* Decorative corner elements */}
                  <span className="absolute inset-0 pointer-events-none">
                    <span className="absolute top-[-4px] left-[-4px] h-2 w-2 border-t border-l border-current opacity-0 transform translate-x-[2px] translate-y-[2px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0" />
                    <span className="absolute top-[-4px] right-[-4px] h-2 w-2 border-t border-r border-current opacity-0 transform -translate-x-[2px] translate-y-[2px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0" />
                    <span className="absolute bottom-[-4px] left-[-4px] h-2 w-2 border-b border-l border-current opacity-0 transform translate-x-[2px] -translate-y-[2px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0" />
                    <span className="absolute bottom-[-4px] right-[-4px] h-2 w-2 border-b border-r border-current opacity-0 transform -translate-x-[2px] -translate-y-[2px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0" />
                  </span>

                  {/* Highlight overlay when active */}
                  {activeExample === type && (
                    <>
                      <motion.div
                        layoutId="mobile-highlight"
                        className="absolute inset-0 bg-[#ffe066]/20 border border-[#ffe066]/80"
                        transition={{
                          type: "spring",
                          bounce: 0.15,
                          duration: 0.5,
                        }}
                      />
                      <motion.div
                        layoutId="mobile-connector"
                        className="absolute bottom-0 left-1/2 w-[2px] h-[0px] bg-[#ffe066]/80 transform -translate-x-1/2 translate-y-full"
                      />
                    </>
                  )}

                  <span className="relative z-10">
                    <HyperText
                      delay={650}
                      className="text-xs ml-0 pl-0 font-semibold"
                      startOnView={false}
                    >
                      {mobileTitle}
                    </HyperText>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-2 px-4 py-2  bg-[#ffe066]/20 border border-[#ffe066]/80 relative">
              {/* Description box connector line */}
              <motion.div
                layoutId="mobile-connector-box"
                className="absolute -top-[10px] left-1/2 w-[2px] h-[10px] bg-[#ffe066]/80 transform -translate-x-1/2 "
                style={{
                  left: `${(100 / examplesData.length) * (examplesData.findIndex((ex) => ex.type === activeExample) + 0.5)}%`,
                }}
              />
              <p className="text-sm text-gray-600">
                {
                  examplesData.find((ex) => ex.type === activeExample)
                    ?.description
                }
              </p>
            </div>
            <div className="mt-4">
              <CodeBlock code={examples[activeExample]} />
            </div>
          </div>

          {/* Desktop Picker (Sidebar on the left) */}
          <div className="hidden md:grid grid-cols-3 gap-6">
            <div className="space-y-2 relative">
              {examplesData.map(({ type, title, description }) => (
                <button
                  key={type}
                  onClick={() => setCommittedExample(type)}
                  onMouseEnter={() => setHoveredExample(type)}
                  onMouseLeave={() => {
                    setCommittedExample(type);
                    setHoveredExample(null);
                  }}
                  className={`w-full h-[84px] px-4 py-3 rounded-[0px] border transition-colors relative group ${
                    activeExample === type
                      ? "bg-transparent border-transparent"
                      : "bg-white hover:bg-[#ffe066]/10"
                  }`}
                >
                  {/* Decorative corner elements */}
                  <span className="absolute inset-0 pointer-events-none">
                    <span className="absolute top-[-4px] left-[-4px] h-2 w-2 border-t border-l border-current opacity-0 transform translate-x-[2px] translate-y-[2px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0" />
                    <span className="absolute top-[-4px] right-[-4px] h-2 w-2 border-t border-r border-current opacity-0 transform -translate-x-[2px] translate-y-[2px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0" />
                    <span className="absolute bottom-[-4px] left-[-4px] h-2 w-2 border-b border-l border-current opacity-0 transform translate-x-[2px] -translate-y-[2px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0" />
                    <span className="absolute bottom-[-4px] right-[-4px] h-2 w-2 border-b border-r border-current opacity-0 transform -translate-x-[2px] -translate-y-[2px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0" />
                  </span>

                  {/* Highlight overlay when active */}
                  {activeExample === type && (
                    <motion.div
                      layoutId="highlight"
                      className="absolute inset-0 bg-[#ffe066]/20 border border-[#ffe066]/80 rounded-[0px]"
                    />
                  )}

                  <div className="flex flex-col justify-center h-full text-left">
                    <h3 className="font-semibold text-sm">
                      <HyperText delay={650} startOnView={false}>
                        {title}
                      </HyperText>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{description}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="col-span-2 h-full">
              <CodeBlock code={examples[activeExample]} />
            </div>
          </div>
        </motion.div>

        {/* Uncomment or add new sections as needed */}
        {/*
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          className="w-full max-w-5xl mx-auto mt-12"
        >
          <h2 className="text-3xl font-bold text-center mb-4">Fine-grained visibility</h2>
        </motion.section>
        */}
      </motion.main>
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
        className="flex gap-6 flex-wrap items-center justify-center pb-8"
      ></motion.footer>
      {/* Bottom spacer bar */}
      <div className="w-full h-[600px] bg-gradient-to-b from-transparent to-black/5" />
    </div>
  );
}

// function ScriptCopyBtnDemo() {
//   const customCommandMap = {
//     npm: "npm create gensx@latest my-app",
//     npx: "npx create gensx my-app",
//     yarn: "yarn create gensx my-app",
//     pnpm: "pnpm create gensx my-app",
//   };
//   return (
//     <ScriptCopyBtn
//       showMultiplePackageOptions={true}
//       codeLanguage="shell"
//       lightTheme="nord"
//       darkTheme="vitesse-dark"
//       commandMap={customCommandMap}
//     />
//   );
// }
