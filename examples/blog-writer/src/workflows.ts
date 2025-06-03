import * as gensx from "@gensx/core";

import { WriteDraft } from "./components/draft.js";
import { Editorial } from "./components/editorial.js";
import { WriteOutline } from "./components/outline.js";
import { Research } from "./components/research.js";

interface WriteBlogProps {
  title: string;
  prompt: string;
}

const WriteBlog = gensx.Workflow("WriteBlog", async (props: WriteBlogProps) => {
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
    outline: outline.object,
    research: research,
  });

  // Step 4: Editorial pass to make it more engaging
  const finalContent = await Editorial({
    title: props.title,
    prompt: props.prompt,
    draft: draft,
  });

  return {
    title: props.title,
    content: finalContent,
    metadata: {
      researchTopics: research.topics,
      sectionsCount: outline.object.sections.length,
      hasWebResearch: research.webResearch.length > 0,
      hasCatalogResearch: research.catalogResearch.some(
        (item) => item.content.length > 0,
      ),
      wordCount: finalContent.split(" ").length,
    },
  };
});

export { WriteBlog };
