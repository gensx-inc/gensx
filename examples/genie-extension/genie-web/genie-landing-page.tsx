import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Github, Zap, Globe, Brain, Settings, Wand2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";

export default function Component() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Genie</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="https://gensx.com"
              className="text-sm font-medium hover:text-purple-600 transition-colors flex items-center gap-2"
            >
              <Image
                src="/gensx-favicon.ico"
                alt="GenSX"
                width={16}
                height={16}
                className="w-4 h-4"
              />
              Powered by GenSX
            </Link>
            <Link
              href="https://github.com/gensx-inc/gensx/tree/main/examples/genie-extension"
              className="text-sm font-medium hover:text-purple-600 transition-colors flex items-center gap-1"
            >
              <Github className="w-4 h-4" />
              GitHub
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero: Focus on the demo and how it works */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-purple-50 to-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <div className="flex justify-center">
                <Link href="https://gensx.com">
                  <Badge
                    variant="secondary"
                    className="bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center gap-2 hover:bg-purple-200 transition-colors cursor-pointer"
                  >
                    <Image
                      src="/gensx-favicon.ico"
                      alt="GenSX"
                      width={16}
                      height={16}
                      className="w-4 h-4"
                    />
                    Built with GenSX Workflows
                  </Badge>
                </Link>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                GenSX Browser Agent
                <span className="text-purple-600"> Demo</span>
              </h1>

              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                This example shows how to build a real, tool-using browser agent
                with GenSX. It demonstrates component-based workflows, planning
                and tool execution, and how the Chrome extension bridges GenSX
                actions to the page.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-lg px-8 py-3"
                >
                  <Link href="#demo">Watch the Demo</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-3"
                >
                  <Link href="https://github.com/gensx-inc/gensx/tree/main/examples/genie-extension">
                    <Github className="w-5 h-5 mr-2" />
                    View Source
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Video Section */}
        <section id="demo" className="py-16 bg-gray-50 scroll-mt-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="w-full rounded-xl shadow-2xl overflow-hidden aspect-video bg-black">
                <iframe
                  src="https://screen.studio/share/YWu2sHvX"
                  title="GenSX Genie Instacart Demo"
                  className="w-full h-full"
                  loading="lazy"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">
                How this demo works
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                The extension is a thin UI. The real logic is a GenSX workflow
                that plans, selects tools, and executes browser actions. Here is
                the flow at a glance:
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card className="border-2 hover:border-purple-200 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <Brain className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle>1) Plan</CardTitle>
                  <CardDescription>
                    A GenSX component interprets your goal and builds a plan
                    using the LLM.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-purple-200 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Globe className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle>2) Choose tools</CardTitle>
                  <CardDescription>
                    The workflow picks tools like navigate, click, extract, and
                    search to satisfy the plan.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-purple-200 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <Settings className="w-6 h-6 text-orange-600" />
                  </div>
                  <CardTitle>3) Execute</CardTitle>
                  <CardDescription>
                    The Chrome extension safely performs the actions in the
                    active tab and reports results.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-purple-200 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-indigo-600" />
                  </div>
                  <CardTitle>4) Reflect + iterate</CardTitle>
                  <CardDescription>
                    Results flow back into the workflow for reflection and next
                    steps until the goal is done.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="mt-16 max-w-4xl mx-auto">
              <div className="text-center space-y-2 mb-6">
                <h3 className="text-2xl font-bold">Workflow excerpt</h3>
                <p className="text-gray-600">
                  A simplified slice from this example’s workflow.
                </p>
              </div>
              <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="p-4 bg-gray-50 border-b text-sm text-gray-600">
                  TypeScript
                </div>
                <div className="p-4 overflow-auto">
                  <CodeBlock
                    language="ts"
                    font="mono"
                    code={`import * as gensx from "@gensx/core";
import { asToolSet } from "@gensx/vercel-ai";
import { anthropic } from "@ai-sdk/anthropic";
import { Agent } from "./agent";
import { getFilteredTools, toolbox } from "../shared/toolbox";
import { analyzeScreenshotTool, queryPageTool } from "./tools/query";
import { webSearchTool } from "./tools/search";
import { createTodoList } from "./tools/todolist";

export const copilotWorkflow = gensx.Workflow(
  "copilot",
  async ({ prompt, threadId, selectedTabs = [], conversationMode = "general" }) => {
    const { userId } = gensx.getExecutionScope() as { userId: string };

    const toolsForModel = getFilteredTools(["fetchPageHtml", "captureElementScreenshot"]);
    const { tools: todoListTools } = createTodoList({ items: [] });

    const tools = {
      ...asToolSet(toolsForModel),
      search: webSearchTool,
      ...todoListTools,
      queryPage: queryPageTool,
      analyzeScreenshotTool,
    };

    const model = anthropic("claude-sonnet-4-20250514");

    const result = await Agent({
      messages: [{ role: "user", content: prompt }],
      tools,
      model,
    });

    return result;
  }
);`}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What this demonstrates */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">
                What this example showcases
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Key GenSX capabilities highlighted by the Genie demo.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">
                    Component-based workflows
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    GenSX composes agent steps as plain TypeScript components.
                    No graphs or DSL to learn — just functions, props, and data
                    flow.
                  </p>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">
                    Planning + tool use
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    The agent plans, selects tools (navigate, click, extract,
                    search), and iterates. Each tool is a reusable component you
                    can swap or extend, and the execution of that tool can
                    happen on the browser-side or server-side, with no extra
                    infrastructure.
                  </p>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Execution bridge</h3>
                  <p className="text-gray-600 leading-relaxed">
                    The extension provides a browser-side runtime that executes
                    the workflow’s chosen tools in the browser and streams
                    results back into the GenSX workflow. This bridge provides a
                    bidirectional communication channel between the GenSX
                    workflow and the browser, while keeping things like API keys
                    secure in the server-side execution environment.
                  </p>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Observability</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Use GenSX Cloud to view traces, inputs/outputs, and
                    iteration steps as your workflow runs.
                  </p>
                </div>
              </div>
              <div className="relative">
                <Image
                  src="https://www.gensx.com/_next/image?url=%2Fdocs-static%2F_next%2Fstatic%2Fmedia%2Ftrace.311786b8.png&w=3840&q=75"
                  alt="GenSX Trace"
                  width={600}
                  height={500}
                  className="rounded-xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Key concepts and run locally */}
        <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-5xl mx-auto space-y-12">
              <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold">
                  Key GenSX concepts in this demo
                </h2>
                <p className="text-lg opacity-90 max-w-3xl mx-auto">
                  Core building blocks you’ll use to build reliable browser
                  agents.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white/10 border border-white/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wand2 className="w-4 h-4" />
                    <span className="font-semibold">
                      Component-based workflows
                    </span>
                  </div>
                  <p className="text-sm opacity-90">
                    Reusable steps with typed inputs/outputs. Compose logic as
                    portable components with clear data flow.
                  </p>
                </div>

                <div className="bg-white/10 border border-white/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-4 h-4" />
                    <span className="font-semibold">Client-side tools</span>
                  </div>
                  <p className="text-sm opacity-90">
                    Execute tools in the browser via the extension bridge; wire
                    them into the workflow with typed contracts. {""}
                    <Link
                      href="https://www.gensx.com/docs/client-side-tools"
                      className="underline"
                    >
                      Docs
                    </Link>
                  </p>
                </div>

                <div className="bg-white/10 border border-white/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4" />
                    <span className="font-semibold">Streaming</span>
                  </div>
                  <p className="text-sm opacity-90">
                    Stream tokens, tool calls, and intermediate state to the UI
                    with hooks. {""}
                    <Link
                      href="https://www.gensx.com/docs/streaming-react"
                      className="underline"
                    >
                      Docs
                    </Link>
                  </p>
                </div>
              </div>

              <div className="bg-white/10 border border-white/20 rounded-lg p-6">
                <h3 className="text-2xl font-bold mb-2">Run locally</h3>
                <p className="opacity-90 mb-4">
                  Clone the repo and launch the example.
                </p>
                <div className="rounded-lg overflow-hidden">
                  <CodeBlock
                    language="bash"
                    font="mono"
                    code={`git clone https://github.com/gensx-inc/gensx
cd gensx/examples/genie-extension
pnpm install
pnpm -w dev`}
                  />
                </div>
                <div className="mt-4">
                  <Button
                    asChild
                    size="lg"
                    className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-purple-600 text-lg px-8 py-3"
                  >
                    <Link href="https://github.com/gensx-inc/gensx/tree/main/examples/genie-extension">
                      View on GitHub
                    </Link>
                  </Button>
                </div>
                <div className="mt-6 text-sm opacity-90 space-y-1">
                  <p>
                    Learn more: {""}
                    <Link
                      href="https://www.gensx.com/docs/client-side-tools"
                      className="underline"
                    >
                      Client-Side Tools
                    </Link>
                    , {""}
                    <Link
                      href="https://www.gensx.com/docs/streaming-react"
                      className="underline"
                    >
                      Streaming
                    </Link>
                    , {""}
                    <Link
                      href="https://www.gensx.com/docs/cloud/serverless-deployments"
                      className="underline"
                    >
                      Serverless deployments
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50">
        <div className="container mx-auto px-4 md:px-6 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Genie Demo</span>
              </div>
              <p className="text-sm text-gray-600">
                A reference example that demonstrates GenSX workflows
                controlling the browser.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Resources</h4>
              <div className="space-y-2 text-sm">
                <Link
                  href="https://gensx.com/docs"
                  className="block text-gray-600 hover:text-purple-600"
                >
                  GenSX Docs
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Connect</h4>
              <div className="space-y-2 text-sm">
                <Link
                  href="https://github.com/gensx-inc/gensx"
                  className="block text-gray-600 hover:text-purple-600 flex items-center gap-1"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </Link>
                <Link
                  href="https://www.linkedin.com/company/gensx-inc"
                  className="block text-gray-600 hover:text-purple-600"
                >
                  LinkedIn
                </Link>
                <Link
                  href="https://twitter.com/gensx_inc"
                  className="block text-gray-600 hover:text-purple-600"
                >
                  Twitter
                </Link>
                <Link
                  href="https://discord.gg/wRmwfz5tCy"
                  className="block text-gray-600 hover:text-purple-600"
                >
                  Discord
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-600">© 2025 GenSX.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
