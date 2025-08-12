import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Chrome,
  Github,
  Zap,
  Globe,
  Brain,
  NotebookTabsIcon as Tabs,
  Search,
  Settings,
  Wand2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Component() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
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
              href="https://github.com/gensx-inc/gensx"
              className="text-sm font-medium hover:text-purple-600 transition-colors flex items-center gap-1"
            >
              <Github className="w-4 h-4" />
              GitHub
            </Link>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
              <Chrome className="w-4 h-4 mr-2" />
              Add to Chrome
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gradient-to-b from-purple-50 to-white">
          <div className="container px-4 md:px-6">
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
                    Powered by GenSX
                  </Badge>
                </Link>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                Your AI Browser
                <span className="text-purple-600"> Copilot</span>
              </h1>

              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Meet Genie, the intelligent Chrome extension that manages tabs,
                controls pages, analyzes content, and completes complex
                tasks—all powered by advanced AI right in your browser.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-lg px-8 py-3"
                >
                  <Chrome className="w-5 h-5 mr-2" />
                  Install Extension
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-3"
                >
                  Watch Demo
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Video Section */}
        <section className="py-16 bg-gray-50">
          <div className="container px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="relative rounded-xl overflow-hidden shadow-2xl">
                <Image
                  src="/genie-ai-copilot-demo.png"
                  alt="Genie Chrome Extension Demo"
                  width={1000}
                  height={600}
                  className="w-full aspect-video object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Button
                    size="lg"
                    className="bg-white/90 text-black hover:bg-white"
                  >
                    <div className="w-0 h-0 border-l-[12px] border-l-black border-y-[8px] border-y-transparent ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="container px-4 md:px-6">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">
                Powerful Browser Automation
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Genie brings AI-powered assistance directly to your browsing
                experience with advanced capabilities.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-2 hover:border-purple-200 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <Tabs className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle>Smart Tab Management</CardTitle>
                  <CardDescription>
                    Automatically organize, group, and manage your browser tabs
                    based on content and context.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-purple-200 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Globe className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle>Page Control</CardTitle>
                  <CardDescription>
                    Navigate websites, fill forms, click buttons, and interact
                    with web pages automatically.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-purple-200 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <Brain className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle>Content Analysis</CardTitle>
                  <CardDescription>
                    Analyze web content, extract key information, and provide
                    intelligent summaries and insights.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-purple-200 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <Search className="w-6 h-6 text-orange-600" />
                  </div>
                  <CardTitle>Intelligent Search</CardTitle>
                  <CardDescription>
                    Search across multiple tabs and websites simultaneously with
                    AI-powered query understanding.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-purple-200 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                    <Settings className="w-6 h-6 text-red-600" />
                  </div>
                  <CardTitle>Task Automation</CardTitle>
                  <CardDescription>
                    Complete complex multi-step tasks across different websites
                    with simple natural language commands.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-purple-200 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-indigo-600" />
                  </div>
                  <CardTitle>GenSX Powered</CardTitle>
                  <CardDescription>
                    Built on the robust GenSX framework for reliable, scalable
                    AI agent workflows.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Screenshots Section */}
        <section className="py-20 bg-gray-50">
          <div className="container px-4 md:px-6">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">
                See Genie in Action
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Experience the power of AI-driven browser automation with these
                key features.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-4">
                    Tab Organization Made Simple
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Genie automatically categorizes and groups your tabs by
                    topic, project, or priority. Say goodbye to tab chaos and
                    hello to organized browsing.
                  </p>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-4">
                    Natural Language Commands
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Simply tell Genie what you want to accomplish: "Find all
                    articles about AI from the last week" or "Fill out this form
                    with my information" and watch it work.
                  </p>
                </div>
              </div>
              <div className="relative">
                <Image
                  src="/chrome-extension-tab-ai.png"
                  alt="Genie Extension Interface"
                  width={600}
                  height={500}
                  className="rounded-xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <h2 className="text-3xl md:text-4xl font-bold">
                Ready to Transform Your Browsing Experience?
              </h2>
              <p className="text-xl opacity-90">
                Join thousands of users who are already using Genie to automate
                their browser tasks and boost productivity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-white text-purple-600 hover:bg-gray-100 text-lg px-8 py-3"
                >
                  <Chrome className="w-5 h-5 mr-2" />
                  Add to Chrome - Free
                </Button>
                <Button
                  size="lg"
                  className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-purple-600 text-lg px-8 py-3"
                >
                  View on GitHub
                </Button>
              </div>
              <p className="text-sm opacity-75">
                Free to install • No account required • Privacy focused
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50">
        <div className="container px-4 md:px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Genie</span>
              </div>
              <p className="text-sm text-gray-600">
                Your AI-powered browser copilot for intelligent web automation.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Product</h4>
              <div className="space-y-2 text-sm">
                <Link
                  href="#"
                  className="block text-gray-600 hover:text-purple-600"
                >
                  Features
                </Link>
                <Link
                  href="#"
                  className="block text-gray-600 hover:text-purple-600"
                >
                  Pricing
                </Link>
                <Link
                  href="#"
                  className="block text-gray-600 hover:text-purple-600"
                >
                  Changelog
                </Link>
              </div>
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
                <Link
                  href="#"
                  className="block text-gray-600 hover:text-purple-600"
                >
                  Support
                </Link>
                <Link
                  href="#"
                  className="block text-gray-600 hover:text-purple-600"
                >
                  Community
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
                  href="#"
                  className="block text-gray-600 hover:text-purple-600"
                >
                  Twitter
                </Link>
                <Link
                  href="#"
                  className="block text-gray-600 hover:text-purple-600"
                >
                  Discord
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-600">
              © 2024 Genie. Powered by GenSX. All rights reserved.
            </p>
            <div className="flex space-x-6 text-sm text-gray-600 mt-4 md:mt-0">
              <Link href="#" className="hover:text-purple-600">
                Privacy Policy
              </Link>
              <Link href="#" className="hover:text-purple-600">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
