"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import AnimatedTitle from "@/components/ui/AnimatedTitle";
import { ExternalLink, Github } from "lucide-react";
import { useState } from "react";

// Showcase data structure - easy to add new items
interface ShowcaseItem {
  id: string;
  title: string;
  description: string;
  image?: string;
  demo?: string; // Link to live demo
  github?: string; // Link to GitHub repo
  tags: string[];
}

const showcaseItems: ShowcaseItem[] = [
  {
    id: "genie-extension",
    title: "Genie Extension",
    description:
      "A Chrome extension that drives and automates any web page via natural language — powered by GenSX.",
    image: "/showcase/genie-extension.png",
    demo: "https://genie.gensx.com",
    github:
      "https://github.com/gensx-inc/gensx/tree/main/examples/genie-extension",
    tags: [
      "Category: Extension",
      "Integration: Chrome Extension",
      "Feature: Client-side tools",
    ],
  },
  {
    id: "map-agent",
    title: "AI Map Agent",
    description:
      "This demo demonstrates the use of client-side tools for enabling the AI agent to interact with the map view and streaming with server-sent events using GenSX.",
    image: "/showcase/map-agent.png",
    demo: "https://map-demo.gensx.com",
    github:
      "https://github.com/gensx-inc/gensx/tree/main/examples/client-side-tools",
    tags: [
      "Framework: Next.js",
      "Category: Map Agent",
      "Integration: Tavily API",
      "Feature: Client-side tools",
      "Feature: Streaming",
    ],
  },
  {
    id: "chat-ux",
    title: "Chat UX",
    description:
      "Next.js chat interface with real-time streaming responses using GenSX workflows and server-sent events.",
    image: "/showcase/chat-ux.png",
    demo: "https://chat-demo.gensx.com",
    github: "https://github.com/gensx-inc/gensx/tree/main/examples/chat-ux",
    tags: ["Framework: Next.js", "Feature: Streaming", "Type: UI Template"],
  },
  {
    id: "draft-pad",
    title: "Draft Pad",
    description:
      "Canvas-style document editor for iterative writing using multiple models across providers.",
    image: "/showcase/draft-pad.png",
    demo: "https://draft-pad-demo.gensx.com",
    github: "https://github.com/gensx-inc/gensx/tree/main/examples/draft-pad",
    tags: [
      "Framework: Next.js",
      "Category: Writing Tool",
      "Feature: Real-time",
    ],
  },
  {
    id: "deep-research",
    title: "Deep Research",
    description:
      "Multi-step research workflow that iteratively searches the web, extracts key findings, and generates detailed reports.",
    image: "/showcase/deep-research.png",
    demo: "https://deep-research-demo.gensx.com",
    github:
      "https://github.com/gensx-inc/gensx/tree/main/examples/deep-research",
    tags: [
      "Framework: Next.js",
      "Category: Research Agent",
      "Integration: Tavily API",
    ],
  },
  {
    id: "blog-writer",
    title: "Blog Writer",
    description:
      "Workflow that generates blog posts by researching topics, creating outlines, and writing SEO-optimized content.",
    github: "https://github.com/gensx-inc/gensx/tree/main/examples/blog-writer",
    tags: [
      "Category: Content Generation",
      "Type: Workflow",
      "Feature: Multi-step",
    ],
  },
  {
    id: "hacker-news-analyzer",
    title: "Hacker News Analyzer",
    description:
      "Fetches and analyzes Hacker News posts and comments to identify trends and sentiment patterns.",
    github:
      "https://github.com/gensx-inc/gensx/tree/main/examples/hacker-news-analyzer",
    tags: [
      "Category: Analytics",
      "Integration: HN API",
      "Type: Data Processing",
    ],
  },
  {
    id: "text-to-sql",
    title: "Text to SQL",
    description:
      "Converts natural language queries to SQL statements with schema awareness and query validation.",
    github: "https://github.com/gensx-inc/gensx/tree/main/examples/text-to-sql",
    tags: ["Category: Database Tool", "Feature: NL to SQL", "Type: Component"],
  },
  {
    id: "rag-example",
    title: "RAG Implementation",
    description:
      "Demonstrates document ingestion, vector storage, and retrieval-augmented generation using GenSX storage.",
    github: "https://github.com/gensx-inc/gensx/tree/main/examples/rag",
    tags: ["Feature: Vector Search", "Category: RAG", "GenSX: Storage"],
  },
  {
    id: "reflection",
    title: "Reflection Agent",
    description:
      "Agent that iteratively improves its responses through self-critique and refinement loops.",
    github: "https://github.com/gensx-inc/gensx/tree/main/examples/reflection",
    tags: [
      "Category: Agent Pattern",
      "Type: Workflow",
      "Feature: Self-improvement",
    ],
  },
  {
    id: "chat-memory",
    title: "Chat with Memory",
    description:
      "Chat application that persists conversation history using GenSX storage for context retention across sessions.",
    github: "https://github.com/gensx-inc/gensx/tree/main/examples/chat-memory",
    tags: ["Category: Chat", "GenSX: Storage", "Feature: Persistence"],
  },
  {
    id: "vercel-ai",
    title: "Vercel AI SDK Integration",
    description:
      "Integration examples showing streaming, tool calling, and text generation with Vercel AI SDK and GenSX.",
    github: "https://github.com/gensx-inc/gensx/tree/main/examples/vercel-ai",
    tags: ["Integration: Vercel AI", "Feature: Streaming", "Type: Examples"],
  },
  {
    id: "openai-examples",
    title: "OpenAI Examples",
    description:
      "Code examples for text generation, function calling, and embeddings using OpenAI models with GenSX.",
    github:
      "https://github.com/gensx-inc/gensx/tree/main/examples/openai-examples",
    tags: ["Provider: OpenAI", "Type: Examples", "Feature: Multiple Models"],
  },
  {
    id: "anthropic-examples",
    title: "Anthropic Claude Examples",
    description:
      "Examples using Claude models for text generation, tool use, and structured outputs with GenSX.",
    github:
      "https://github.com/gensx-inc/gensx/tree/main/examples/anthropic-examples",
    tags: ["Provider: Anthropic", "Model: Claude", "Type: Examples"],
  },
  {
    id: "groq-deepseek",
    title: "Groq & DeepSeek Models",
    description:
      "Examples using Groq's fast inference API with various models including DeepSeek for code generation.",
    github:
      "https://github.com/gensx-inc/gensx/tree/main/examples/groq-deepseek",
    tags: ["Provider: Groq", "Model: DeepSeek", "Feature: Fast Inference"],
  },
  {
    id: "open-router",
    title: "OpenRouter Integration",
    description:
      "Unified API access to multiple AI models through OpenRouter with automatic failover and routing.",
    github: "https://github.com/gensx-inc/gensx/tree/main/examples/open-router",
    tags: ["Provider: OpenRouter", "Feature: Multi-model", "Type: Integration"],
  },
  {
    id: "llm-games",
    title: "LLM-Powered Games",
    description:
      "Board game implementations where AI opponents use LLMs for move selection and strategy explanation.",
    github: "https://github.com/gensx-inc/gensx/tree/main/examples/llm-games",
    tags: ["Category: Game", "Framework: React", "Type: Interactive Demo"],
  },
  {
    id: "self-modifying-code",
    title: "Self-Modifying Code Agent",
    description:
      "Agent that reads its own source code, analyzes it, and generates improvements or fixes using AI.",
    github:
      "https://github.com/gensx-inc/gensx/tree/main/examples/self-modifying-code",
    tags: [
      "Category: Experimental Agent",
      "Feature: Code Generation",
      "Type: Advanced",
    ],
  },
  {
    id: "openai-computer-use",
    title: "OpenAI Computer Use",
    description:
      "Browser automation using OpenAI vision models to analyze screenshots and control web interfaces.",
    github:
      "https://github.com/gensx-inc/gensx/tree/main/examples/openai-computer-use",
    tags: ["Provider: OpenAI", "Feature: Vision", "Category: Automation"],
  },
  {
    id: "all-models-metadata",
    title: "Model Metadata Explorer",
    description:
      "Workflow that fetches and displays technical specifications, context limits, and pricing for AI models.",
    github:
      "https://github.com/gensx-inc/gensx/tree/main/examples/all-models-metadata",
    tags: ["Category: Reference Tool", "Type: Workflow", "Feature: Model Info"],
  },
  {
    id: "salty-ocean-model-comparison",
    title: "Model Comparison Tool",
    description:
      "Side-by-side comparison interface for testing prompts across multiple AI models simultaneously.",
    github:
      "https://github.com/gensx-inc/gensx/tree/main/examples/salty-ocean-model-comparison",
    tags: ["Category: Developer Tool", "Feature: Multi-model", "Type: Utility"],
  },
  {
    id: "commonjs-compatibility",
    title: "CommonJS Compatibility Example",
    description:
      "Demonstrates using GenSX with require() syntax in CommonJS environments and Node.js < 14.",
    github:
      "https://github.com/gensx-inc/gensx/tree/main/examples/commonjs-compatibility",
    tags: ["Environment: CommonJS", "Platform: Node.js", "Type: Compatibility"],
  },
  {
    id: "typescript-compatibility",
    title: "TypeScript Compatibility Example",
    description:
      "TypeScript configuration and usage patterns for GenSX with strict type checking enabled.",
    github:
      "https://github.com/gensx-inc/gensx/tree/main/examples/typescript-compatibility",
    tags: ["Language: TypeScript", "Feature: Type Safety", "Type: Examples"],
  },
  {
    id: "nextjs-ai-chatbot-template",
    title: "Next.js AI Chatbot Template",
    description:
      "Production-ready chatbot template with authentication, database integration, and deployment configs.",
    github:
      "https://github.com/gensx-inc/gensx/tree/main/examples/nextjs-ai-chatbot-template",
    tags: ["Framework: Next.js", "Category: Template", "Type: Full-stack"],
  },
];

// Separate component for showcase cards to handle hover state
function ShowcaseCard({
  item,
  index,
  startIndex,
}: {
  item: ShowcaseItem;
  index: number;
  startIndex: number;
}) {
  const [isGithubHovered, setIsGithubHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: 0.1 * (startIndex + index + 1),
        ease: "easeOut",
      }}
    >
      <div className="relative group h-full">
        <div
          className="relative h-full bg-white rounded-[0px] border border-gray-200 transition-all duration-300 hover:border-[#ffde59] hover:shadow-lg hover:shadow-[#ffde59]/20 cursor-pointer"
          onClick={() => {
            const link = item.demo || item.github;
            if (link) {
              window.open(link, "_blank");
            }
          }}
        >
          {/* Image */}
          <div className="aspect-video overflow-hidden bg-gray-100 relative">
            {item.image ? (
              <Image
                src={item.image}
                alt={item.title}
                width={600}
                height={400}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div
                style={{
                  background: `linear-gradient(${120 + ((index * 137) % 240)}deg,
                    hsl(${(index * 137) % 360}, 20%, 85%) 0%,
                    hsl(${(index * 137 + 60) % 360}, 15%, 88%) 50%,
                    hsl(${(index * 137 + 120) % 360}, 25%, 83%) 100%)`,
                }}
                className="w-full h-full"
              />
            )}
            {/* Title overlay */}
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="relative">
                {/* Gradient blur background */}
                <div
                  className="absolute -inset-x-16 -inset-y-8 backdrop-blur-md"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 30%, rgba(255,255,255,0.3) 60%, transparent 90%)",
                    mask: "radial-gradient(ellipse at center, black 0%, transparent 100%)",
                    WebkitMask:
                      "radial-gradient(ellipse at center, black 0%, transparent 100%)",
                  }}
                />
                <h3 className="relative text-2xl font-bold text-black text-center px-8 py-4">
                  {item.title}
                </h3>
              </div>
            </div>
            {/* Click indicator */}
            {(item.demo || item.github) && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-white/90 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1 text-xs text-gray-600">
                  <ExternalLink size={12} />
                  <span>{item.demo ? "Demo" : "GitHub"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-600 mb-4">{item.description}</p>

            {/* Links - only show GitHub link if there's also a demo link */}
            {item.demo && item.github && (
              <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                <div className="relative group/link">
                  <Link
                    href={item.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 transition-colors group/link px-3 py-1.5"
                    onMouseEnter={() => setIsGithubHovered(true)}
                    onMouseLeave={() => setIsGithubHovered(false)}
                  >
                    <Github size={16} />
                    <span>GitHub</span>
                  </Link>

                  {/* Corner brackets for GitHub link */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Top left corner */}
                    <div
                      className="absolute -top-1 -left-1 w-3 h-3 border-t border-l border-gray-800
                      opacity-0 -translate-x-1 -translate-y-1 transition-all duration-300
                      group-hover/link:opacity-100 group-hover/link:translate-x-0 group-hover/link:translate-y-0"
                    ></div>
                    {/* Top right corner */}
                    <div
                      className="absolute -top-1 -right-1 w-3 h-3 border-t border-r border-gray-800
                      opacity-0 translate-x-1 -translate-y-1 transition-all duration-300
                      group-hover/link:opacity-100 group-hover/link:translate-x-0 group-hover/link:translate-y-0"
                    ></div>
                    {/* Bottom left corner */}
                    <div
                      className="absolute -bottom-1 -left-1 w-3 h-3 border-b border-l border-gray-800
                      opacity-0 -translate-x-1 translate-y-1 transition-all duration-300
                      group-hover/link:opacity-100 group-hover/link:translate-x-0 group-hover/link:translate-y-0"
                    ></div>
                    {/* Bottom right corner */}
                    <div
                      className="absolute -bottom-1 -right-1 w-3 h-3 border-b border-r border-gray-800
                      opacity-0 translate-x-1 translate-y-1 transition-all duration-300
                      group-hover/link:opacity-100 group-hover/link:translate-x-0 group-hover/link:translate-y-0"
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Decorative corner brackets - hide when GitHub link is hovered */}
        <div
          className={`absolute inset-0 pointer-events-none z-50 ${isGithubHovered ? "opacity-0" : ""} transition-opacity duration-300`}
        >
          {/* Top left corner */}
          <div
            className="absolute -top-2 -left-2 w-5 h-5 border-t border-l border-gray-800
            opacity-0 -translate-x-2 -translate-y-2 transition-all duration-300
            group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0"
          ></div>
          {/* Top right corner */}
          <div
            className="absolute -top-2 -right-2 w-5 h-5 border-t border-r border-gray-800
            opacity-0 translate-x-2 -translate-y-2 transition-all duration-300
            group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0"
          ></div>
          {/* Bottom left corner */}
          <div
            className="absolute -bottom-2 -left-2 w-5 h-5 border-b border-l border-gray-800
            opacity-0 -translate-x-2 translate-y-2 transition-all duration-300
            group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0"
          ></div>
          {/* Bottom right corner */}
          <div
            className="absolute -bottom-2 -right-2 w-5 h-5 border-b border-r border-gray-800
            opacity-0 translate-x-2 translate-y-2 transition-all duration-300
            group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0"
          ></div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ShowcaseClient() {
  // Separate items with demos from those without
  const itemsWithDemos = showcaseItems.filter((item) => item.demo);
  const itemsWithoutDemos = showcaseItems.filter((item) => !item.demo);

  const renderShowcaseGrid = (
    items: ShowcaseItem[],
    startIndex: number = 0,
  ) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item, index) => (
        <ShowcaseCard
          key={item.id}
          item={item}
          index={index}
          startIndex={startIndex}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen w-full max-w-7xl mx-auto pt-32 px-4 md:px-8 pb-20">
      <div className="max-w-6xl mx-auto">
        <AnimatedTitle>Showcase</AnimatedTitle>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-xl text-gray-600 text-center mb-12 max-w-3xl mx-auto -mt-12"
        >
          Explore demo applications and code examples built with GenSX
        </motion.p>

        {/* Live Demos Section */}
        {itemsWithDemos.length > 0 && (
          <div className="mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
              className="text-2xl md:text-3xl font-bold text-gray-900 mb-8"
            >
              Live Demos
            </motion.h2>
            {renderShowcaseGrid(itemsWithDemos, 0)}
          </div>
        )}

        {/* Code Examples Section */}
        {itemsWithoutDemos.length > 0 && (
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
              className="text-2xl md:text-3xl font-bold text-gray-900 mb-8"
            >
              Code Examples
            </motion.h2>
            {renderShowcaseGrid(itemsWithoutDemos, itemsWithDemos.length)}
          </div>
        )}
      </div>
    </div>
  );
}
