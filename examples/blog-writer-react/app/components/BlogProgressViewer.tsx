"use client";

import { useEffect } from "react";
// import type { BlogWorkflowState } from "../../workflows/workflows";

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

interface BlogProgressViewerProps {
  state: BlogWorkflowState;
  onComplete?: (result: BlogOutput) => void;
}

export function BlogProgressViewer({
  state,
  onComplete,
}: BlogProgressViewerProps) {
  // Simulate completion detection - in a real app, you'd get this from the workflow result
  useEffect(() => {
    if (state.overall.phase === "complete" && onComplete) {
      // Simulate a blog result - in reality this would come from the workflow
      const simulatedResult: BlogOutput = {
        title: "The Future of AI in 2025",
        content: "This is where the generated blog content would appear...",
        metadata: {
          researchTopics: state.research.topics,
          sectionsCount: state.outline.sections.length,
          hasWebResearch: state.research.webResearchCount > 0,
          hasToneMatching: !!state.toneMatching,
          wordCount: state.draft.totalWordCount || 1500,
        },
      };

      onComplete(simulatedResult);
    }
  }, [
    state.overall.phase,
    onComplete,
    state.research.topics,
    state.outline.sections.length,
    state.research.webResearchCount,
    state.toneMatching,
    state.draft.totalWordCount,
  ]);

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case "research":
        return "🔍";
      case "outline":
        return "📋";
      case "draft":
        return "✍️";
      case "editorial":
        return "✏️";
      case "tone-matching":
        return "🎨";
      case "complete":
        return "✅";
      default:
        return "⏳";
    }
  };

  const getPhaseColor = (phase: string, currentPhase: string) => {
    const phases = [
      "research",
      "outline",
      "draft",
      "editorial",
      "tone-matching",
      "complete",
    ];
    const currentIndex = phases.indexOf(currentPhase);
    const phaseIndex = phases.indexOf(phase);

    if (phaseIndex < currentIndex) return "text-green-600 dark:text-green-400"; // Complete
    if (phaseIndex === currentIndex) return "text-blue-600 dark:text-blue-400"; // Current
    return "text-gray-400 dark:text-gray-500"; // Pending
  };

  const ProgressBar = ({
    current,
    total,
    label,
  }: {
    current: number;
    total: number;
    label?: string;
  }) => (
    <div className="w-full">
      {label && (
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
          {label}
        </div>
      )}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min((current / total) * 100, 100)}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {current} / {total} {label ? label.toLowerCase() : "steps"}
      </div>
    </div>
  );

  const StatusBadge = ({
    status,
    label,
  }: {
    status: string;
    label?: string;
  }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case "generating":
        case "planning":
        case "initializing":
        case "analyzing":
          return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
        case "researching":
        case "writing":
          return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
        case "complete":
          return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
        case "reviewing":
          return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
        default:
          return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      }
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}
      >
        {label || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {getPhaseIcon(state.overall.phase)} Overall Progress
          </h3>
          <StatusBadge status={state.overall.phase} />
        </div>

        <ProgressBar
          current={state.overall.progress.current}
          total={state.overall.progress.total}
          label="Phases"
        />

        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <strong>Current Step:</strong> {state.overall.currentStep}
        </div>

        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Started: {new Date(state.overall.startTime).toLocaleTimeString()}
        </div>

        {/* Phase Timeline */}
        <div className="mt-4 flex items-center space-x-4 text-sm">
          {[
            "research",
            "outline",
            "draft",
            "editorial",
            state.toneMatching ? "tone-matching" : null,
            "complete",
          ]
            .filter(Boolean)
            .map((phase) => (
              <div
                key={phase}
                className={`flex items-center space-x-1 ${getPhaseColor(phase!, state.overall.phase)}`}
              >
                <span>{getPhaseIcon(phase!)}</span>
                <span className="capitalize">{phase!.replace("-", " ")}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Research Progress */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white">
            🔍 Research Phase
          </h4>
          <StatusBadge status={state.research.phase} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Topics Generated:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {state.research.topics.length}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Research Completed:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {state.research.completedTopics.length}
            </span>
          </div>

          {state.research.totalTopics > 0 && (
            <ProgressBar
              current={state.research.completedTopics.length}
              total={state.research.totalTopics}
              label="Topics"
            />
          )}

          {state.research.currentTopic && (
            <div className="text-sm text-blue-600 dark:text-blue-400 mt-2">
              <strong>Current:</strong> {state.research.currentTopic}
            </div>
          )}

          {state.research.topics.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Research Topics:
              </div>
              <div className="flex flex-wrap gap-1">
                {state.research.topics.map((topic, index) => (
                  <span
                    key={index}
                    className={`text-xs px-2 py-1 rounded ${
                      state.research.completedTopics.includes(topic)
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                        : topic === state.research.currentTopic
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Outline Progress */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white">
            📋 Outline Phase
          </h4>
          <StatusBadge status={state.outline.phase} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">Sections:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {state.outline.sections.length}
            </span>
          </div>

          {state.outline.sections.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Outline Sections:
              </div>
              <div className="space-y-1">
                {state.outline.sections.map((section, index) => (
                  <div
                    key={index}
                    className="text-sm bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {section.heading}
                    </div>
                    {section.keyPoints && section.keyPoints.length > 0 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {section.keyPoints[0]}
                        {section.keyPoints.length > 1 &&
                          ` (+${section.keyPoints.length - 1} more)`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Draft Progress */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white">
            ✍️ Draft Phase
          </h4>
          <StatusBadge status={state.draft.phase} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Word Count:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {state.draft.totalWordCount} / {state.draft.targetWordCount}
            </span>
          </div>

          {state.draft.targetWordCount > 0 && (
            <ProgressBar
              current={state.draft.totalWordCount}
              total={state.draft.targetWordCount}
              label="Words"
            />
          )}

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Sections Written:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {state.draft.sections.length}
            </span>
          </div>

          {state.draft.sections.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Draft Sections:
              </div>
              <div className="space-y-1">
                {state.draft.sections.map((section, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {section.heading}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {section.wordCount} words
                      </div>
                    </div>
                    <StatusBadge status={section.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editorial Progress */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white">
            ✏️ Editorial Phase
          </h4>
          <StatusBadge status={state.editorial.phase} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Reviews Completed:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {state.editorial.reviews.length}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Improvements Made:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {state.editorial.improvementsCount}
            </span>
          </div>

          {state.editorial.reviews.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Editorial Reviews:
              </div>
              <div className="space-y-1">
                {state.editorial.reviews.map((review, index) => (
                  <div
                    key={index}
                    className="text-sm bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {review.section}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {review.improvements.join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tone Matching Progress (if applicable) */}
      {state.toneMatching && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">
              🎨 Tone Matching Phase
            </h4>
            <StatusBadge status={state.toneMatching.phase} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Reference URL:
              </span>
              <a
                href={state.toneMatching.referenceURL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline text-xs truncate max-w-48"
              >
                {state.toneMatching.referenceURL}
              </a>
            </div>

            {state.toneMatching.similarityScore !== undefined && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Similarity Score:
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {(state.toneMatching.similarityScore * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raw State Data (for debugging) */}
      <details className="mt-6">
        <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
          🔍 Raw State Data (Debug)
        </summary>
        <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto text-gray-700 dark:text-gray-300">
          {JSON.stringify(state, null, 2)}
        </pre>
      </details>
    </div>
  );
}
