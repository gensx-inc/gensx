import { anthropic } from "@ai-sdk/anthropic";
import * as gensx from "@gensx/core";
import { generateText } from "@gensx/vercel-ai";
import { tool } from "ai";
import { z } from "zod";

import { WebResearch } from "./research.js";

interface OutlineData {
  title: string;
  sections: {
    heading: string;
    keyPoints: string[];
    sectionType?: "introduction" | "body" | "conclusion";
    researchTopics?: string[];
    subsections?: {
      heading: string;
      keyPoints: string[];
      researchTopics?: string[];
    }[];
  }[];
}

interface DraftProps {
  title: string;
  prompt: string;
  outline?: OutlineData;
  research?: {
    topics: string[];
    webResearch: {
      topic: string;
      content: string;
      citations: string[];
      source: string;
    }[];
  };
  targetWordCount?: number;
}

const WriteSection = gensx.Component(
  "WriteSection",
  async (props: {
    section: OutlineData["sections"][0];
    research?: DraftProps["research"];
    overallContext: string;
    fullOutline?: OutlineData;
    targetWordCount?: number;
  }) => {
    gensx.publishData(`Writing section: ${props.section.heading}`);

    // Simplify research data for the prompt
    const relevantResearch = props.research
      ? `Available Research Data:
${JSON.stringify(props.research, null, 2)}`
      : "";

    // Create a simplified outline for reference
    const outlineForReference = props.fullOutline
      ? {
          title: props.fullOutline.title,
          sections: props.fullOutline.sections.map((s) => ({
            heading: s.heading,
            sectionType: s.sectionType,
            keyPoints: s.keyPoints,
            subsections: s.subsections?.map((sub) => ({
              heading: sub.heading,
              keyPoints: sub.keyPoints,
            })),
          })),
        }
      : {};

    // Create web research tool
    const webResearchTool = tool({
      description:
        "Conduct additional web research on a specific topic to get current, detailed information for this section",
      parameters: z.object({
        topic: z.string().describe("The specific topic to research"),
      }),
      execute: async ({ topic }: { topic: string }) => {
        const result = await WebResearch({ topic });
        return {
          topic: result.topic,
          content: result.content,
          citations: result.citations,
          source: result.source,
        };
      },
    });

    const sectionContent = await generateText({
      model: anthropic("claude-opus-4-20250514"),
      maxSteps: 6,
      maxTokens: 3000,
      tools: {
        webResearch: webResearchTool,
      },
      prompt: `You are an expert content writer at a SaaS company like MongoDB, Datadog, or Microsoft. You are helping write an article. Your task is to write a single section of the article.

You have access to a web research tool that you can use to get additional current information for this section. You may call this tool at most twice if you need more specific or recent information beyond what's provided in the research below.

Here are the steps to follow to write a high quality and informative section:

1. Use the research provided to perform in-depth analysis specific to this section. Use the provided research topics as suggestions and focus on the most accurate and up-to-date information available.
2. Think through the section planning:
  a. Consider any code examples or other resources that would be relevant to this section.
  b. Identify the research that is applicable to this section based on the provided research results.
  c. Figure out the 'why' behind the key statements and claims in this section. Follow Simon Sinek's 'Start with Why' and the 'why -> what -> how' framework; avoid generic or unsubstantiated claims by providing clear explanations and substantiated reasoning.
  d. Plan a concise and clear heading for this section and each subsection.
3. Write the section at a college reading level. It should be dense with information and include sufficient depth and detail.
4. Ensure that the language is clear and concise, and avoid flowery or buzzword filled language.

🔗 CRITICAL LINK POLICY:
- You MAY include links in your writing, but ONLY use links that are explicitly provided in the research citations below
- NEVER create, invent, or hallucinate any URLs or links
- If you reference information from the research, you can and should include the corresponding citation link
- When using research citations, format them as proper markdown links: [descriptive text](URL)
- If you want to reference a concept or company but don't have a citation link for it, mention it by name only without creating a link
- All links must come directly from the "citations" arrays in the research data provided

Important rules to follow:
- Include the heading of the section with the appropriate markdown formatting. It should have a single ## before it, and each subsection heading and nested subsection heading should have the right number of #s before it to match the heading level.
- This section should be in-depth, and provide the necessary detail for the key points, but be concise and avoid fluff.
- Each section and subsection should be at most 2 paragraphs.
- Be sure to include an explanation of any code examples that you use so that the reader can understand what the code is doing.
- If you are writing an introduction or conclusion section, you should write it in a way that makes sense based on the rest of the article and the key points of the other sections.
- Do not use bullet points or lists. Instead, write about multiple points in paragraph format.

Guidelines for quality writing:

- **Use Short Sentences:** Keep sentences under 30 words to enhance readability and comprehension.
- **Replace Adjectives with Data:** Substitute vague adjectives with concrete data to make writing specific and objective, using data from the research results provided. If no data is available for a claim, you can leave it as is.
- **Eliminate Weasel Words:** Remove vague language and weasel words like "may," "might," or "could" to strengthen your message.
- **Apply the "So-What" Test:** Ensure each point conveys a clear purpose or message, prompting the reader to understand why it's important. If a sentence does not provide value, you can remove it as long as flow is maintained.
- **Avoid Adverbs and Unnecessary Qualifiers:** Eliminate adverbs and phrases like "very," "really," "I think," or "it seems" for more direct and decisive writing.
- **Be Objective and Avoid Jargon:** Use clear, accessible language free of jargon acronyms to include all readers, regardless of their expertise.
- **Use Subject-Verb-Object Structure:** Construct sentences in a subject-verb-object order for clarity and conciseness.
- **Tailor Writing to the Audience:** Keep the audience's needs and understanding in mind, adjusting language and tone accordingly.
- **Simplify Language:** Avoid unnecessary or complex words and phrases, opting for straightforward and easy-to-understand language.

Here is the section you need to write:

Section Heading: ${props.section.heading}
Section Type: ${props.section.sectionType ?? "body"}

Key Points to Cover:
${props.section.keyPoints.map((point) => `- ${point}`).join("\n")}

${
  props.section.researchTopics?.length
    ? `Research Topics to Consider:
${props.section.researchTopics.map((topic) => `- ${topic}`).join("\n")}`
    : ""
}

${
  props.section.subsections?.length
    ? `Subsections:
${props.section.subsections
  .map(
    (sub) => `### ${sub.heading}
Key Points: ${sub.keyPoints.join(", ")}`,
  )
  .join("\n\n")}`
    : ""
}

${
  relevantResearch
    ? `Available Research:
${relevantResearch}`
    : ""
}

For reference, here is the outline of the article:

Article Outline for Reference:
${JSON.stringify(outlineForReference, null, 2)}

Overall Context: ${props.overallContext}

Write the section content with proper markdown formatting including the section heading with ## and any subsection headings with the appropriate number of # characters.

Remember: Only use links that are explicitly provided in the research citations above. Do not create any new links or URLs.`,
    });

    // Return the raw text output from the LLM
    gensx.publishData(`Completed section: ${props.section.heading}`);
    return sectionContent.text;
  },
);

const WriteDraft = gensx.Component("WriteDraft", async (props: DraftProps) => {
  if (!props.outline) {
    return "No outline provided - cannot generate draft.";
  }

  gensx.publishData("Starting article draft...");

  // Write all sections in parallel
  const sectionPromises = props.outline.sections.map((section) =>
    WriteSection({
      section,
      research: props.research,
      overallContext: props.prompt,
      fullOutline: props.outline,
      targetWordCount: props.targetWordCount,
    }),
  );

  const sections = await Promise.all(sectionPromises);

  // Combine all sections with proper headings
  const fullDraft = [
    `# ${props.title}`,
    "",
    ...sections.flatMap((section) => [section, ""]),
  ].join("\n");

  gensx.publishData("Article draft complete");
  return fullDraft;
});

export { WriteDraft };
