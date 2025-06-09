"use client";

import { useState } from "react";
import { useWorkflowWithState } from "@gensx/react";
import { BlogProgressViewer } from "./components/BlogProgressViewer";
import { BlogInputForm } from "./components/BlogInputForm";
import { BlogResultViewer } from "./components/BlogResultViewer";

// import type { BlogWorkflowState } from "../workflows/workflows";

// Temporary mock type for demo purposes (until workflow dependencies are resolved)
interface BlogWorkflowState {
  overall: {
    phase:
      | "research"
      | "outline"
      | "draft"
      | "editorial"
      | "tone-matching"
      | "complete";
    startTime: string;
    progress: { current: number; total: number };
    currentStep: string;
  };
  research: {
    topics: string[];
    completedTopics: string[];
    currentTopic?: string;
    phase: "generating" | "researching" | "complete";
    webResearchCount: number;
    totalTopics: number;
  };
  outline: {
    sections: { heading: string; keyPoints: string[] }[];
    phase: "planning" | "structuring" | "complete";
    totalSections: number;
  };
  draft: {
    sections: Array<{ heading: string; wordCount: number; status: string }>;
    totalWordCount: number;
    targetWordCount: number;
    phase: "initializing" | "writing" | "complete";
  };
  editorial: {
    reviews: { section: string; improvements: string[] }[];
    phase: "analyzing" | "rewriting" | "complete";
    improvementsCount: number;
  };
  toneMatching?: {
    referenceURL: string;
    phase: "analyzing" | "matching" | "complete";
    similarityScore?: number;
  };
}

interface BlogInput {
  title: string;
  prompt: string;
  referenceURL?: string;
  wordCount?: number;
}

interface BlogOutput {
  title: string;
  content: string;
  metadata: {
    researchTopics: string[];
    sectionsCount: number;
    hasWebResearch: boolean;
    hasToneMatching: boolean;
    wordCount: number;
  };
}

export default function BlogWriterPage() {
  const [blogInput, setBlogInput] = useState<BlogInput | null>(null);

  // ✨ THE MAGIC: Using our React hooks with the exact same types as the workflow!
  // This demonstrates the power of shared TypeScript types between frontend and backend
  const {
    start,
    state: workflowState,
    isLoading,
    error,
    isComplete,
    executionId,
  } = useWorkflowWithState<BlogInput, BlogWorkflowState>(
    "/WriteBlog", // Development endpoint - automatically connects to localhost:1337
    "blog-workflow", // State name that matches our workflow
  );

  const [finalResult, setFinalResult] = useState<BlogOutput | null>(null);

  const handleStartWorkflow = async (input: BlogInput) => {
    setBlogInput(input);
    setFinalResult(null);

    try {
      const executionId = await start(input);
      console.log("🚀 Started blog workflow with execution ID:", executionId);
    } catch (err) {
      console.error("❌ Failed to start workflow:", err);
    }
  };

  // When workflow completes, we could fetch the final result
  // For now, we'll simulate it from the state
  const handleWorkflowComplete = (result: BlogOutput) => {
    setFinalResult(result);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            GenSX Blog Writer
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Real-time Hierarchical State Composition Demo
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Watch as the workflow&apos;s rich state updates flow to the frontend
            in real-time
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Input and Controls */}
          <div className="space-y-6">
            {/* Input Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                📝 Blog Configuration
              </h2>
              <BlogInputForm
                onSubmit={handleStartWorkflow}
                isLoading={isLoading}
                disabled={isLoading}
              />
            </div>

            {/* Execution Status */}
            {(executionId || error) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  ⚡ Execution Status
                </h2>

                {executionId && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Execution ID:{" "}
                      <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                        {executionId}
                      </code>
                    </p>
                  </div>
                )}

                {isLoading && (
                  <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Workflow is running...</span>
                  </div>
                )}

                {isComplete && (
                  <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                    <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                    <span>Workflow completed successfully!</span>
                  </div>
                )}

                {error && (
                  <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                    <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                    <span>Error: {error.message}</span>
                  </div>
                )}
              </div>
            )}

            {/* Current Input Display */}
            {blogInput && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  📋 Current Request
                </h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Title:
                    </span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      {blogInput.title}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Prompt:
                    </span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      {blogInput.prompt}
                    </span>
                  </div>
                  {blogInput.wordCount && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Word Count:
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {blogInput.wordCount}
                      </span>
                    </div>
                  )}
                  {blogInput.referenceURL && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Reference URL:
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {blogInput.referenceURL}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Real-time Progress and Results */}
          <div className="space-y-6">
            {/* Real-time Progress Visualization */}
            {workflowState && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  📊 Real-time Workflow State
                </h2>
                <BlogProgressViewer
                  state={workflowState}
                  onComplete={handleWorkflowComplete}
                />
              </div>
            )}

            {/* Final Blog Post */}
            {finalResult && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  📄 Generated Blog Post
                </h2>
                <BlogResultViewer result={finalResult} />
              </div>
            )}
          </div>
        </div>

        {/* Footer: Technology Showcase */}
        <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          <p className="mb-2">
            🚀 <strong>Powered by GenSX Hierarchical State Composition</strong>
          </p>
          <p>
            This demo shows real-time state streaming from a complex
            multi-component workflow using{" "}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
              @gensx/react
            </code>{" "}
            hooks with full TypeScript type safety.
          </p>
        </div>
      </div>
    </div>
  );
}
