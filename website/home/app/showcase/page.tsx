import AnimatedPage from "@/components/AnimatedPage";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowUpRight, Github, Code2, Database, MessageSquare, Search, PenTool, Brain, Monitor, FileText, Gamepad2, Sparkles, Layout, Zap, GitCompare, Layers, Package, Coffee } from "lucide-react";

interface ShowcaseItem {
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
  category: "basic" | "full" | "additional";
}

const showcaseItems: ShowcaseItem[] = [
  // Basic Examples
  {
    title: "Reflection Pattern",
    description: "Learn how to implement self-reflection patterns with GenSX for improved AI responses",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/reflection",
    icon: <Brain className="w-6 h-6" />,
    category: "basic"
  },
  {
    title: "Anthropic Examples",
    description: "Comprehensive examples showing how to use @gensx/anthropic for various AI tasks",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/anthropic-examples",
    icon: <Code2 className="w-6 h-6" />,
    category: "basic"
  },
  {
    title: "OpenAI Examples",
    description: "Complete guide to using @gensx/openai with practical examples and best practices",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/openai-examples",
    icon: <Sparkles className="w-6 h-6" />,
    category: "basic"
  },
  {
    title: "Vercel AI SDK",
    description: "Integration examples with Vercel AI SDK for building modern AI applications",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/vercel-ai",
    icon: <Code2 className="w-6 h-6" />,
    category: "basic"
  },
  // Full Examples
  {
    title: "Hacker News Analyzer",
    description: "Analyzes HN posts and generates summaries using Paul Graham's writing style",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/hacker-news-analyzer",
    icon: <Search className="w-6 h-6" />,
    category: "full"
  },
  {
    title: "AI Blog Writer",
    description: "End-to-end blog generation workflow including topic research and content creation",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/blog-writer",
    icon: <PenTool className="w-6 h-6" />,
    category: "full"
  },
  {
    title: "Deep Research",
    description: "Generate comprehensive reports by researching and summarizing academic papers",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/deep-research",
    icon: <FileText className="w-6 h-6" />,
    category: "full"
  },
  {
    title: "Computer Use Demo",
    description: "Demonstrates OpenAI computer use capabilities with GenSX integration",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/openai-computer-use",
    icon: <Monitor className="w-6 h-6" />,
    category: "full"
  },
  {
    title: "Text to SQL",
    description: "Natural language to SQL query translation with database integration",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/text-to-sql",
    icon: <Database className="w-6 h-6" />,
    category: "full"
  },
  {
    title: "RAG Implementation",
    description: "Retrieval augmented generation using vector search and storage",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/rag",
    icon: <Search className="w-6 h-6" />,
    category: "full"
  },
  {
    title: "Chat with Memory",
    description: "Build chat applications with persistent history using blob storage",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/chat-memory",
    icon: <MessageSquare className="w-6 h-6" />,
    category: "full"
  },
  {
    title: "LLM Games",
    description: "Interactive games powered by large language models",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/llm-games",
    icon: <Gamepad2 className="w-6 h-6" />,
    category: "full"
  },
  {
    title: "Next.js AI Chatbot",
    description: "Production-ready AI chatbot template built with Next.js and GenSX",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/nextjs-ai-chatbot-template",
    icon: <MessageSquare className="w-6 h-6" />,
    category: "full"
  },
  // Additional Examples
  {
    title: "Chat UX Patterns",
    description: "Best practices and patterns for building chat user interfaces",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/chat-ux",
    icon: <Layout className="w-6 h-6" />,
    category: "additional"
  },
  {
    title: "Model Comparison",
    description: "Compare different AI models side-by-side for performance and quality",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/salty-ocean-model-comparison",
    icon: <GitCompare className="w-6 h-6" />,
    category: "additional"
  },
  {
    title: "All Models Metadata",
    description: "Explore metadata and capabilities of all supported AI models",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/all-models-metadata",
    icon: <Layers className="w-6 h-6" />,
    category: "additional"
  },
  {
    title: "Self-Modifying Code",
    description: "Advanced example showing AI that can modify its own code",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/self-modifying-code",
    icon: <Zap className="w-6 h-6" />,
    category: "additional"
  },
  {
    title: "Draft Pad",
    description: "Interactive drafting tool powered by AI for content creation",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/draft-pad",
    icon: <FileText className="w-6 h-6" />,
    category: "additional"
  },
  {
    title: "Open Router Integration",
    description: "Use Open Router to access multiple AI models through a single API",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/open-router",
    icon: <Layers className="w-6 h-6" />,
    category: "additional"
  },
  {
    title: "Groq & DeepSeek",
    description: "Examples using Groq and DeepSeek models for fast inference",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/groq-deepseek",
    icon: <Zap className="w-6 h-6" />,
    category: "additional"
  },
  {
    title: "TypeScript Compatibility",
    description: "Ensure your GenSX code works perfectly with TypeScript",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/typescript-compatibility",
    icon: <Package className="w-6 h-6" />,
    category: "additional"
  },
  {
    title: "CommonJS Compatibility",
    description: "Examples showing CommonJS module compatibility",
    link: "https://github.com/gensx-inc/gensx/tree/main/examples/commonjs-compatibility",
    icon: <Coffee className="w-6 h-6" />,
    category: "additional"
  }
];

function ShowcaseCard({ item }: { item: ShowcaseItem }) {
  return (
    <Link
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <div className="relative h-full bg-white border border-gray-200 rounded-lg p-6 transition-all duration-300 hover:shadow-lg hover:border-[#ffde59] hover:-translate-y-1">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-[#ffde59]/10 transition-colors">
            {item.icon}
          </div>
          <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-800">
          {item.title}
        </h3>
        
        <p className="text-sm text-gray-600 line-clamp-3">
          {item.description}
        </p>
        
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ffde59] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-b-lg" />
      </div>
    </Link>
  );
}

export default function ShowcasePage() {
  const basicExamples = showcaseItems.filter(item => item.category === "basic");
  const fullExamples = showcaseItems.filter(item => item.category === "full");
  const additionalExamples = showcaseItems.filter(item => item.category === "additional");

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                GenSX Showcase
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                Explore real-world examples and implementations built with GenSX. 
                From simple patterns to full-featured applications.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link href="https://github.com/gensx-inc/gensx/tree/main/examples" target="_blank" rel="noopener noreferrer">
                  <Button variant="primary" className="inline-flex items-center gap-2">
                    <Github className="w-5 h-5" />
                    View All Examples
                  </Button>
                </Link>
                <Link href="/docs">
                  <Button variant="ghost">
                    Read Documentation
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Examples Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Basic Examples</h2>
            <p className="text-gray-600">Get started with fundamental patterns and integrations</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {basicExamples.map((item, index) => (
              <ShowcaseCard key={index} item={item} />
            ))}
          </div>
        </div>

        {/* Full Examples Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Full Applications</h2>
            <p className="text-gray-600">Complete implementations showcasing GenSX capabilities</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fullExamples.map((item, index) => (
              <ShowcaseCard key={index} item={item} />
            ))}
          </div>
        </div>

        {/* Additional Examples Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Additional Examples</h2>
            <p className="text-gray-600">More specialized examples and integrations</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalExamples.map((item, index) => (
              <ShowcaseCard key={index} item={item} />
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Build?</h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Start building your own AI-powered applications with GenSX today
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/docs/getting-started">
                <Button variant="primary" className="bg-[#ffde59] text-gray-900 hover:bg-[#ffde59]/90">
                  Get Started
                </Button>
              </Link>
              <Link href="https://discord.gg/wRmwfz5tCy" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" className="text-white border-white hover:bg-white hover:text-gray-900">
                  Join Community
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}