'use client'

import { CodeBlock } from "@/components/ui/code-block";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { HyperText } from "@/components/ui/hyper-text";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ScriptCopyBtn } from "@/components/ui/script-copy-btn";
import Link from "next/link";

export default function Home() {
  type ExampleType = 'components' | 'workflows' | 'agents' | 'llms';

  // State that remains when you click an example.
  const [committedExample, setCommittedExample] = useState<ExampleType>('components');
  // Temporary state that updates on hover (overriding the committed one temporarily).
  const [hoveredExample, setHoveredExample] = useState<ExampleType | null>(null);
  // The active example is the hovered one (if one exists) or the committed one.
  const activeExample = hoveredExample ?? committedExample;
  
  const examples: Record<ExampleType, string> = {
    components: `import { Component } from 'gensx';
import { OpenAIChatCompletion, OpenAIChatCompletionProps } from 'gensx/openai';

type GenerateTextOutput = {
  text: string;
}
const GenerateText = Component<OpenAIChatCompletionProps, GenerateTextOutput>("Generate Text",
  (props: OpenAIChatCompletionProps) => {
    const chatCompletionProps = {
      model: "gpt-4o",
      temperature: 0.7,
      maxTokens: 2000,
    };
    return (
      <OpenAIChatCompletion props={{...props, ...chatCompletionProps}}>
        {(output: ChatCompletionOutput) => {
          return { text: output.choices[0].message.content };
        }}
      </OpenAIChatCompletion>
    );
  }
);

type WriteBlogProps = {
  prompt: string;
}
type WriteBlogOutput = {
  blog: string;
}
const WriteBlog = Component<WriteBlogProps, WriteBlogOutput>("Write Blog",  
  (props: WriteBlogProps) => {
    const chatCompletionProps = {
      prompt: \`Write a blog for the prompt: \${props.prompt}\`,
    };
    return (
      <GenerateText props={chatCompletionProps}>
        {(output: GenerateTextOutput) => output.text}
      </GenerateText>
    );
  }
);

type RemoveBuzzWordsProps = {
  blog: string;
}
type RemoveBuzzWordsOutput = {
  blog: string;
}
const RemoveBuzzWords = Component<RemoveBuzzWordsProps, RemoveBuzzWordsOutput>("Remove Buzz Words", 
  (props: RemoveBuzzWordsProps) => {
    const chatCompletionProps = {
      prompt: \`Remove common buzzwords and jargon from this text while preserving the meaning: \${props.draft}\`,
    };
    return (
      <GenerateText props={chatCompletionProps}>
        {(output: GenerateTextOutput) => output.text}
      </GenerateText>
    );
  }
);
`,
    workflows: `import { Workflow } from 'gensx';
import { WriteBlog, RemoveBuzzWords } from './write-blog';

type BlogWorkflowProps = {
  prompt: string;
}
type BlogWorkflowOutput = {
  blog: string;
}
const WriteBlogWorkflow = Workflow<BlogWorkflowInput, BlogWorkflowOutput>(
  "Blog Workflow",
  (props: BlogWorkflowInput) => (
    <WriteBlog prompt={props.prompt}>
      {(output: WriteBlogOutput) => (
        <RemoveBuzzWords draft={output.blog}>
          {(output: RemoveBuzzWordsOutput) => {
            return { blog: output.result };
          }}
        </RemoveBuzzWords>
      )}
    </WriteBlog>
  )
);

const result = WriteBlogWorkflow.run({ prompt: "Write a blog post about AI developer tools." });
`,
    agents: `import { Swarm, Agent, Tool } from 'ai-agent-sdk';

// Define a custom tool
const calculator = new Tool({
  name: "calculator",
  description: "Perform calculations",
  function: async (input: string) => {
    return eval(input).toString();
  }
});

const agent = new Agent({
  name: "Math Helper",
  tools: [calculator],
});

const result = await agent.run({
  message: "What is 123 * 456?"
});`,
    llms: `import { Swarm, Agent } from 'ai-agent-sdk';

// Create an agent with custom behavior
const agent = new Agent({
  name: "Custom Agent",
  model: "gpt-4",
  temperature: 0.7,
  maxTokens: 1000,
  
  // Define custom decision making
  async decide(context) {
    const { message, memory } = context;
    
    // Access agent's memory
    const relevantHistory = await memory.search(message);
    
    // Make decisions based on context
    if (relevantHistory.length > 0) {
      return this.useHistoricalContext(relevantHistory);
    }
    
    return this.generateNewResponse(message);
  }
});`
  };

  // Define an array of button/tab details so we can map over them.
  const examplesData: { type: ExampleType; title: string; description: string; mobileTitle: string }[] = [
    {
      type: "components",
      title: "Define Components",
      mobileTitle: "Components",
      description: "Create building blocks for your app with reusable components.",
    },
    {
      type: "workflows",
      title: "Build Workflows",
      mobileTitle: "Workflows",
      description: "Use Components to build and run workflows.",
    },
    {
      type: "agents",
      title: "Orchestrate Agents",
      mobileTitle: "Agents",
      description: "Wire agents together to create more complex workflows.",
    },
    {
      type: "llms",
      title: "Exchangable LLMs",
      mobileTitle: "LLMs",
      description: "Switch between different LLMs to see which one works best for your use case.",
    },
  ];

  return (
    <div className="min-h-screen">
      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col gap-4 items-center w-full max-w-7xl mx-auto pt-32 px-4 md:px-8 pb-20 mt-0 md:mt-8"
      >
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.0, ease: "easeOut" }}
          className="max-w-3xl mx-auto flex flex-col items-center text-center"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-center">
            The AI framework built for TypeScript developers
          </h1>
          <p className="max-w-2xl text-md md:text-xl text-gray-600 mt-6 leading-relaxed text-center">
            Easy to learn. Lightning fast dev loop. Reusable components.
          </p>
          <div className="flex gap-4 mt-8 justify-center">
            
              <Link href="/docs/quickstart">
              <Button variant="primary" >
                <div className="flex items-center">
                  <span>
                    <HyperText delay={650} startOnView={false}>Start Building</HyperText>
                  </span>
                  <ArrowUpRight className="ml-2 w-4 h-4" />
                </div>
              </Button>
            </Link>
              <Link href="/docs">
              <Button variant="secondary" >
                <div className="flex items-center">
                  <span>
                    <HyperText delay={650} startOnView={false}>View Docs</HyperText>
                  </span>
                  <ArrowUpRight className="ml-2 w-4 h-4" />
                </div>
              </Button>
            </Link>
          </div>
          <ScriptCopyBtnDemo />
        </motion.div>

        {/* Example Picker Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="w-full max-w-5xl mx-auto mt-12"
        >
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
                          duration: 0.5
                        }}
                      />
                      <motion.div
                        layoutId="mobile-connector"
                        className="absolute bottom-0 left-1/2 w-[2px] h-[0px] bg-[#ffe066]/80 transform -translate-x-1/2 translate-y-full"
                      />
                    </>
                  )}

                  <span className="relative z-10">
                    <HyperText delay={650} className="text-xs ml-0 pl-0 font-semibold" startOnView={false}>
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
                  left: `${(100 / examplesData.length) * (examplesData.findIndex(ex => ex.type === activeExample) + 0.5)}%`
                }}
              />
              <p className="text-sm text-gray-600">{examplesData.find(ex => ex.type === activeExample)?.description}</p>
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
      >
      </motion.footer>
    </div>
  );
}

function ScriptCopyBtnDemo() {
  const customCommandMap = {
    npm: "npm create gensx@latest my-app",
    npx: "npx create gensx my-app",
    yarn: "yarn create gensx my-app",
    pnpm: "pnpm create gensx my-app",

  };
  return (
    <ScriptCopyBtn
      showMultiplePackageOptions={true}
      codeLanguage="shell"
      lightTheme="nord"
      darkTheme="vitesse-dark"
      commandMap={customCommandMap}
    />
  );
}
