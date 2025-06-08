import * as gensx from "@gensx/core";

import { type DraftState, WriteDraft } from "./components/draft.js";
import {
  Editorial,
  type EditorialState,
  MatchTone,
  type ToneMatchingState,
} from "./components/editorial.js";
import { type OutlineState, WriteOutline } from "./components/outline.js";
import { Research, type ResearchState } from "./components/research.js";

interface WriteBlogProps {
  title: string;
  prompt: string;
  referenceURL?: string;
  wordCount?: number;
}

/**
 * Rich hierarchical state structure for the blog writing workflow.
 *
 * This demonstrates the power of GenSX's hierarchical state composition:
 * - Overall workflow progress and phase tracking
 * - Individual component state (research, outline, draft, editorial, tone-matching)
 * - Type-safe state attachment and propagation
 * - Real-time frontend visibility into all workflow aspects
 *
 * When components are converted to StatefulComponent, their individual states
 * will automatically flow into this workflow state structure via state attachment.
 */
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
  research: ResearchState;
  outline: OutlineState;
  draft: DraftState;
  editorial: EditorialState;
  toneMatching?: ToneMatchingState;
}

const WriteBlog = gensx.Workflow("WriteBlog", async (props: WriteBlogProps) => {
  // Default word count to 1500 if not specified
  const targetWordCount = props.wordCount ?? 1500;

  // ==================================================================================
  // HIERARCHICAL STATE COMPOSITION IMPLEMENTATION
  // ==================================================================================
  //
  // This workflow demonstrates the full power of GenSX's hierarchical state composition:
  //
  // 🎯 **Key Benefits:**
  // - **Real-time Progress**: Frontend sees detailed progress for each component
  // - **Type Safety**: Full TypeScript support for nested state structures
  // - **State Isolation**: Components manage their own state independently
  // - **Explicit Composition**: Clear attachment of component states to workflow state
  // - **Rich UIs**: Enable sophisticated progress indicators and detailed status
  //
  // 🏗️ **Architecture:**
  // 1. Workflow creates a master state structure
  // 2. Each StatefulComponent creates its own state manager
  // 3. Component states are explicitly attached to workflow state properties
  // 4. State updates automatically propagate to frontend via attachment system
  //
  // 📊 **Frontend Integration:**
  // React components can consume this rich state with:
  // ```typescript
  // import { useGensxState } from '@gensx/react';
  // import type { BlogWorkflowState } from './workflows';
  //
  // function BlogProgress() {
  //   const { state } = useGensxState<BlogWorkflowState>('/workflows/blog', 'blog-workflow');
  //
  //   return (
  //     <div>
  //       <h2>Phase: {state.overall.phase}</h2>
  //       <ProgressBar current={state.overall.progress.current} total={state.overall.progress.total} />
  //
  //       <ResearchProgress
  //         topics={state.research.topics}
  //         completed={state.research.completedTopics}
  //         current={state.research.currentTopic}
  //         phase={state.research.phase}
  //       />
  //
  //       <DraftProgress
  //         sections={state.draft.sections}
  //         totalWords={state.draft.totalWordCount}
  //         phase={state.draft.phase}
  //       />
  //     </div>
  //   );
  // }
  // ```
  //
  // ==================================================================================

  // 1. CREATE WORKFLOW STATE with initial structure
  const workflowState = gensx.workflowState<BlogWorkflowState>(
    "blog-workflow",
    {
      overall: {
        phase: "research",
        startTime: new Date().toISOString(),
        progress: { current: 0, total: props.referenceURL ? 5 : 4 },
        currentStep: "Starting research phase",
      },
      research: {
        topics: [],
        completedTopics: [],
        currentTopic: undefined,
        phase: "generating",
        webResearchCount: 0,
        totalTopics: 0,
      },
      outline: {
        sections: [],
        phase: "planning",
        totalSections: 0,
      },
      draft: {
        sections: [],
        totalWordCount: 0,
        targetWordCount,
        phase: "initializing",
      },
      editorial: {
        reviews: [],
        phase: "analyzing",
        improvementsCount: 0,
      },
      ...(props.referenceURL && {
        toneMatching: {
          referenceURL: props.referenceURL,
          phase: "analyzing",
          similarityScore: undefined,
        },
      }),
    },
  );

  // 2. EXECUTE STATEFUL COMPONENTS WITH STATE ATTACHMENT

  // Step 1: Research component with rich progress tracking
  workflowState.update((s) => ({
    ...s,
    overall: {
      ...s.overall,
      currentStep: "Conducting research",
    },
  }));

  const { output: researchOutput, state: researchState } = Research({
    title: props.title,
    prompt: props.prompt,
  });

  // 🔗 ATTACH: Research component state → workflow.research
  // Frontend now sees: research.phase, research.topics, research.currentTopic, etc.
  workflowState.attachments.research.attach(researchState);

  const research = await researchOutput;

  // Step 2: Outline component with section-by-section progress
  workflowState.update((s) => ({
    ...s,
    overall: {
      ...s.overall,
      phase: "outline",
      progress: { ...s.overall.progress, current: 1 },
      currentStep: "Creating content outline",
    },
  }));

  const { output: outlineOutput, state: outlineState } = WriteOutline({
    title: props.title,
    prompt: props.prompt,
    research: research,
  });

  // 🔗 ATTACH: Outline component state → workflow.outline
  // Frontend now sees: outline.phase, outline.sections, outline.totalSections, etc.
  workflowState.attachments.outline.attach(outlineState);

  const outline = await outlineOutput;

  // Step 3: Draft component with parallel section writing
  workflowState.update((s) => ({
    ...s,
    overall: {
      ...s.overall,
      phase: "draft",
      progress: { ...s.overall.progress, current: 2 },
      currentStep: "Writing draft content",
    },
  }));

  const { output: draftOutput, state: draftState } = WriteDraft({
    title: props.title,
    prompt: props.prompt,
    outline: outline.object,
    research: research,
    targetWordCount: targetWordCount,
  });

  // 🔗 ATTACH: Draft component state → workflow.draft
  // Frontend now sees: draft.sections[].status, draft.totalWordCount, etc.
  workflowState.attachments.draft.attach(draftState);

  const draft = await draftOutput;

  // Step 4: Editorial component with improvement tracking
  workflowState.update((s) => ({
    ...s,
    overall: {
      ...s.overall,
      phase: "editorial",
      progress: { ...s.overall.progress, current: 3 },
      currentStep: "Performing editorial review",
    },
  }));

  const { output: editorialOutput, state: editorialState } = Editorial({
    title: props.title,
    prompt: props.prompt,
    draft: draft,
    targetWordCount: targetWordCount,
  });

  // 🔗 ATTACH: Editorial component state → workflow.editorial
  // Frontend now sees: editorial.phase, editorial.reviews, editorial.improvementsCount, etc.
  workflowState.attachments.editorial.attach(editorialState);

  const finalContent = await editorialOutput;

  // Step 5: Optional tone matching
  let toneMatchedContent = finalContent;
  if (props.referenceURL) {
    workflowState.update((s) => ({
      ...s,
      overall: {
        ...s.overall,
        phase: "tone-matching",
        progress: { ...s.overall.progress, current: 4 },
        currentStep: "Matching tone to reference content",
      },
    }));

    const { output: toneMatchOutput, state: toneMatchState } = MatchTone({
      title: props.title,
      content: finalContent,
      referenceURL: props.referenceURL,
    });

    // 🔗 ATTACH: ToneMatch component state → workflow.toneMatching (if available)
    // Frontend now sees: toneMatching.phase, toneMatching.similarityScore, etc.
    if (workflowState.attachments.toneMatching) {
      workflowState.attachments.toneMatching.attach(toneMatchState);
    }

    toneMatchedContent = await toneMatchOutput;
  }

  // Mark workflow as complete
  workflowState.update((s) => ({
    ...s,
    overall: {
      ...s.overall,
      phase: "complete",
      progress: {
        ...s.overall.progress,
        current: s.overall.progress.total,
      },
      currentStep: "Blog post completed successfully!",
    },
  }));

  gensx.emitProgress("Blog post completed successfully!");

  return {
    title: props.title,
    content: toneMatchedContent,
    metadata: {
      researchTopics: research.topics,
      sectionsCount: outline.object.sections.length,
      hasWebResearch: research.webResearch.length > 0,
      hasToneMatching: !!props.referenceURL,
      wordCount: toneMatchedContent.split(" ").length,
    },
  };
});

export { WriteBlog };
export type { BlogWorkflowState };
