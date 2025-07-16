import * as gensx from "@gensx/core";

import { WriteDraft } from "./components/draft.js";
import { Editorial, MatchTone } from "./components/editorial.js";
import { WriteOutline } from "./components/outline.js";
import { Research } from "./components/research.js";

interface WriteBlogProps {
  title: string;
  prompt: string;
  referenceURL?: string;
  wordCount?: number;
}

const WriteBlog = gensx.Workflow("WriteBlog", async (props: WriteBlogProps) => {
  // Default word count to 1500 if not specified
  const targetWordCount = props.wordCount ?? 1500;

  // Step 1: Conduct research
  const research = await Research({
    title: props.title,
    prompt: props.prompt,
  });

  // Step 2: Create outline based on research
  const outline = await WriteOutline({
    title: props.title,
    prompt: props.prompt,
    research: research,
  });

  // Step 3: Write draft based on outline and research
  const draft = await WriteDraft({
    title: props.title,
    prompt: props.prompt,
    outline: outline,
    research: research,
    targetWordCount: targetWordCount,
  });

  // Step 4: Editorial pass to make it more engaging
  const finalContent = await Editorial({
    title: props.title,
    prompt: props.prompt,
    draft: draft,
    targetWordCount: targetWordCount,
  });

  // Step 5: Optional tone matching if reference URL is provided
  let toneMatchedContent = finalContent;
  if (props.referenceURL) {
    toneMatchedContent = await MatchTone({
      title: props.title,
      content: finalContent,
      referenceURL: props.referenceURL,
    });
  }

  return {
    title: props.title,
    content: toneMatchedContent,
    metadata: {
      researchTopics: research.topics,
      sectionsCount: outline.sections.length,
      hasWebResearch: research.webResearch.length > 0,
      hasToneMatching: !!props.referenceURL,
      wordCount: toneMatchedContent.split(" ").length,
    },
  };
});

export { WriteBlog };
