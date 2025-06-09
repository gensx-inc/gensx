"use client";

import { useWorkflowWithState } from "@gensx/react";
import { BlogInputForm } from "./components/BlogInputForm";

import type { BlogWorkflowState, WriteBlogProps } from "../workflows/workflows";

// Temporary mock type for demo purposes (until workflow dependencies are resolved)

// Progress indicator component
const ProgressBar = ({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label?: string;
}) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full">
      {label && (
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </div>
      )}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {current} of {total} ({percentage}%)
      </div>
    </div>
  );
};

// Phase status indicator
const PhaseStatus = ({
  phase,
  isActive,
  isComplete,
}: {
  phase: string;
  isActive: boolean;
  isComplete: boolean;
}) => {
  return (
    <div
      className={`flex items-center space-x-2 text-sm ${
        isComplete
          ? "text-green-600 dark:text-green-400"
          : isActive
            ? "text-blue-600 dark:text-blue-400"
            : "text-gray-400 dark:text-gray-600"
      }`}
    >
      <div
        className={`w-3 h-3 rounded-full ${
          isComplete
            ? "bg-green-600"
            : isActive
              ? "bg-blue-600 animate-pulse"
              : "bg-gray-300 dark:bg-gray-600"
        }`}
      ></div>
      <span className="capitalize font-medium">{phase}</span>
    </div>
  );
};

// Research component display
const ResearchProgress = ({
  research,
}: {
  research: BlogWorkflowState["research"];
}) => {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200">
          🔍 Research
        </h3>
        <PhaseStatus
          phase={research.phase}
          isActive={
            research.phase === "generating" || research.phase === "researching"
          }
          isComplete={research.phase === "complete"}
        />
      </div>

      <div className="space-y-3">
        <ProgressBar
          current={research.completedTopics.length}
          total={research.totalTopics}
          label="Research Topics"
        />

        {research.currentTopic && (
          <div className="bg-white dark:bg-gray-800 rounded p-3 border">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Currently Researching:
            </div>
            <div className="text-purple-600 dark:text-purple-400 font-medium">
              {research.currentTopic}
            </div>
          </div>
        )}

        {research.topics.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Topics ({research.topics.length}):
            </div>
            <div className="grid grid-cols-1 gap-1">
              {research.topics.map((topic, idx) => (
                <div
                  key={idx}
                  className={`text-xs px-2 py-1 rounded ${
                    research.completedTopics.includes(topic)
                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                      : research.currentTopic === topic
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {research.completedTopics.includes(topic)
                    ? "✓"
                    : research.currentTopic === topic
                      ? "⏳"
                      : "○"}{" "}
                  {topic}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Outline component display
const OutlineProgress = ({
  outline,
}: {
  outline: BlogWorkflowState["outline"];
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
          📋 Outline
        </h3>
        <PhaseStatus
          phase={outline.phase}
          isActive={
            outline.phase === "planning" || outline.phase === "structuring"
          }
          isComplete={outline.phase === "complete"}
        />
      </div>

      <div className="space-y-3">
        {outline.totalSections > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {outline.totalSections} sections planned
          </div>
        )}

        {outline.sections.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sections:
            </div>
            <div className="space-y-2">
              {outline.sections.map((section, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 rounded p-2 border"
                >
                  <div className="font-medium text-sm text-blue-700 dark:text-blue-300">
                    {section.heading}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {section.keyPoints.length} key points
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Draft component display
const DraftProgress = ({ draft }: { draft: BlogWorkflowState["draft"] }) => {
  const wordsProgress =
    draft.targetWordCount > 0
      ? Math.round((draft.totalWordCount / draft.targetWordCount) * 100)
      : 0;

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
          ✍️ Draft
        </h3>
        <PhaseStatus
          phase={draft.phase}
          isActive={draft.phase === "initializing" || draft.phase === "writing"}
          isComplete={draft.phase === "complete"}
        />
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <ProgressBar
              current={
                draft.sections.filter((s) => s.status === "complete").length
              }
              total={draft.sections.length}
              label="Sections Written"
            />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Word Count
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {draft.totalWordCount.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Target: {draft.targetWordCount.toLocaleString()} ({wordsProgress}
              %)
            </div>
          </div>
        </div>

        {draft.sections.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Section Status:
            </div>
            <div className="space-y-1">
              {draft.sections.map((section, idx) => (
                <div
                  key={idx}
                  className={`text-xs px-2 py-1 rounded flex justify-between ${
                    section.status === "complete"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                      : section.status === "writing"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <span>
                    {section.status === "complete"
                      ? "✓"
                      : section.status === "writing"
                        ? "⏳"
                        : "○"}{" "}
                    {section.heading}
                  </span>
                  <span>
                    {section.wordCount > 0 && `${section.wordCount} words`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Editorial component display
const EditorialProgress = ({
  editorial,
}: {
  editorial: BlogWorkflowState["editorial"];
}) => {
  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200">
          ✏️ Editorial
        </h3>
        <PhaseStatus
          phase={editorial.phase}
          isActive={
            editorial.phase === "analyzing" || editorial.phase === "rewriting"
          }
          isComplete={editorial.phase === "complete"}
        />
      </div>

      <div className="space-y-3">
        {editorial.improvementsCount > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {editorial.improvementsCount} improvements identified
          </div>
        )}

        {editorial.reviews.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reviews:
            </div>
            <div className="space-y-2">
              {editorial.reviews.map((review, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 rounded p-2 border"
                >
                  <div className="font-medium text-sm text-orange-700 dark:text-orange-300">
                    {review.section}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {review.improvements.length} improvements:{" "}
                    {review.improvements.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Tone matching component display
const ToneMatchingProgress = ({
  toneMatching,
}: {
  toneMatching: BlogWorkflowState["toneMatching"];
}) => {
  if (!toneMatching) return null;

  return (
    <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-violet-200 dark:border-violet-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-violet-800 dark:text-violet-200">
          🎨 Tone Matching
        </h3>
        <PhaseStatus
          phase={toneMatching.phase}
          isActive={
            toneMatching.phase === "analyzing" ||
            toneMatching.phase === "matching"
          }
          isComplete={toneMatching.phase === "complete"}
        />
      </div>

      <div className="space-y-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Reference:{" "}
          <span className="font-medium">{toneMatching.referenceURL}</span>
        </div>

        {toneMatching.similarityScore !== undefined && (
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Similarity Score
            </div>
            <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
              {Math.round(toneMatching.similarityScore * 100)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function BlogWriterPage() {
  const {
    start,
    state: workflowState,
    isLoading,
    error,
    isComplete,
    executionId,
  } = useWorkflowWithState<WriteBlogProps, BlogWorkflowState>(
    "/WriteBlog",
    "blog-workflow",
  );

  const handleStartWorkflow = async (input: WriteBlogProps) => {
    try {
      const executionId = await start(input);
      console.log("🚀 Started blog workflow with execution ID:", executionId);
    } catch (err) {
      console.error("❌ Failed to start workflow:", err);
    }
  };

  console.log("🚀 Workflow State:", workflowState);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto">
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

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column: Input and Controls */}
          <div className="xl:col-span-1 space-y-6">
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

            {/* Overall Progress */}
            {workflowState && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  📊 Overall Progress
                </h2>
                <div className="space-y-4">
                  <div>
                    <div className="text-lg font-semibold text-gray-800 dark:text-gray-200 capitalize">
                      Phase: {workflowState.overall.phase}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {workflowState.overall.currentStep}
                    </div>
                  </div>

                  <ProgressBar
                    current={workflowState.overall.progress.current}
                    total={workflowState.overall.progress.total}
                    label="Workflow Steps"
                  />

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Started:{" "}
                    {new Date(workflowState.overall.startTime).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Columns: Detailed Progress Views */}
          <div className="xl:col-span-2 space-y-6">
            {workflowState && (
              <>
                {/* Research Progress */}
                <ResearchProgress research={workflowState.research} />

                {/* Outline Progress */}
                <OutlineProgress outline={workflowState.outline} />

                {/* Draft Progress */}
                <DraftProgress draft={workflowState.draft} />

                {/* Editorial Progress */}
                <EditorialProgress editorial={workflowState.editorial} />

                {/* Tone Matching Progress */}
                {workflowState.toneMatching && (
                  <ToneMatchingProgress
                    toneMatching={workflowState.toneMatching}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
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
