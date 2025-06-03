import { anthropic } from "@ai-sdk/anthropic";
import * as gensx from "@gensx/core";
import { generateText } from "@gensx/vercel-ai";

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
      citations: {
        url: string;
        title?: string;
      }[];
      source: string;
    }[];
    catalogResearch: {
      topic: string;
      content: {
        id: string;
        content: string;
        title: string;
        score: number;
      }[];
      source: string;
    }[];
  };
}

const WriteSection = gensx.Component(
  "WriteSection",
  async (props: {
    section: OutlineData["sections"][0];
    research?: DraftProps["research"];
    overallContext: string;
    fullOutline?: OutlineData;
  }) => {
    // Find relevant research based on section heading and key points
    const sectionKeywords = [
      props.section.heading,
      ...props.section.keyPoints,
      ...(props.section.researchTopics ?? []),
    ]
      .join(" ")
      .toLowerCase();

    const relevantResearch = props.research
      ? [
          "Relevant Research:",
          ...props.research.webResearch
            .filter(
              (item) =>
                sectionKeywords.includes(item.topic.toLowerCase()) ||
                item.topic
                  .toLowerCase()
                  .includes(props.section.heading.toLowerCase()) ||
                props.section.keyPoints.some(
                  (point) =>
                    point.toLowerCase().includes(item.topic.toLowerCase()) ||
                    item.topic.toLowerCase().includes(point.toLowerCase()),
                ),
            )
            .map(
              (item) => `${item.topic}: ${item.content.substring(0, 400)}...
Citations: ${item.citations.map((cite) => `- ${cite.title ?? "Source"}: ${cite.url}`).join("\n")}`,
            ),
          "",
        ].join("\n")
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

    const sectionContent = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      maxTokens: 3000,
      prompt: `You are an expert content writer at a SaaS company like MongoDB, Datadog, or Microsoft. You are helping write an article. Your task is to write a single section of the article.

Here are the steps to follow to write a high quality and informative section:
<steps-to-follow>
1. Use the research provided to perform in-depth analysis specific to this section. Use the provided research topics as suggestions and focus on the most accurate and up-to-date information available.
2. Inside <section-planning> tags:
  a. Think about any code examples or other resources that would be relevant to this section.
  b. Think about the research that is applicable to this section based on the provided research results.
  c. Consider useful links that would be relevant to this section (though you cannot create new links, focus on the content structure).
  d. Figure out the 'why' behind the key statements and claims in this section. Follow Simon Sinek's 'Start with Why' and the 'why -> what -> how' framework; avoid generic or unsubstantiated claims by providing clear explanations and substantiated reasoning.
  e. Brainstorm a concise and clear heading for this section and each subsection.
3. Write the section at a college reading level. It should be dense with information and include sufficient depth and detail.
4. Ensure that the language is clear and concise, and avoid flowery or buzzword filled language.
5. Reduce the number of words in the section to the minimum necessary to convey the information.
</steps-to-follow>

<important-rules-to-follow>
- Include the heading of the section with the appropriate markdown formatting. It should have a single ## before it, and each subsection heading and nested subsection heading should have the right number of #s before it to match the heading level.
- This section should be in-depth, and provide the necessary detail for the key points, but be concise and avoid fluff.
- Each section and subsection should be at most 2 paragraphs.
- Be sure to include an explanation of any code examples that you use so that the reader can understand what the code is doing.
- If you are writing an introduction or conclusion section, you should write it in a way that makes sense based on the rest of the article and the key points of the other sections.
- Do not use bullet points or lists. Instead, write about multiple points in paragraph format.
</important-rules-to-follow>

Guidelines for quality writing:

<guidelines>
- **Use Short Sentences:** Keep sentences under 30 words to enhance readability and comprehension.
- **Replace Adjectives with Data:** Substitute vague adjectives with concrete data to make writing specific and objective, using data from the research results provided. If no data is available for a claim, you can leave it as is.
- **Eliminate Weasel Words:** Remove vague language and weasel words like "may," "might," or "could" to strengthen your message.
- **Apply the "So-What" Test:** Ensure each point conveys a clear purpose or message, prompting the reader to understand why it's important. If a sentence does not provide value, you can remove it as long as flow is maintained.
- **Avoid Adverbs and Unnecessary Qualifiers:** Eliminate adverbs and phrases like "very," "really," "I think," or "it seems" for more direct and decisive writing.
- **Be Objective and Avoid Jargon:** Use clear, accessible language free of jargon acronyms to include all readers, regardless of their expertise.
- **Use Subject-Verb-Object Structure:** Construct sentences in a subject-verb-object order for clarity and conciseness.
- **Tailor Writing to the Audience:** Keep the audience's needs and understanding in mind, adjusting language and tone accordingly.
- **Simplify Language:** Avoid unnecessary or complex words and phrases, opting for straightforward and easy-to-understand language.
</guidelines>

Here is the section you need to write:
<section-details>
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
</section-details>

${
  relevantResearch
    ? `Available Research:
${relevantResearch}`
    : ""
}

For reference, here is the outline of the article:
<article-outline-for-reference>
${JSON.stringify(outlineForReference, null, 2)}
</article-outline-for-reference>

Overall Context: ${props.overallContext}

Output format:
<section_content>
[Section content with proper markdown formatting]
</section_content>`,
    });

    // Extract content from the structured output
    const match = sectionContent.text.match(
      /<section_content>([\s\S]*?)<\/section_content>/,
    );
    return match ? match[1].trim() : sectionContent.text;
  },
);

const WriteDraft = gensx.Component("WriteDraft", async (props: DraftProps) => {
  if (!props.outline) {
    return "No outline provided - cannot generate draft.";
  }

  // Write all sections in parallel
  const sectionPromises = props.outline.sections.map((section) =>
    WriteSection({
      section,
      research: props.research,
      overallContext: props.prompt,
      fullOutline: props.outline,
    }),
  );

  const sections = await Promise.all(sectionPromises);

  // Combine all sections with proper headings
  const fullDraft = [
    `# ${props.title}`,
    "",
    ...sections.flatMap((section) => [section, ""]),
  ].join("\n");

  // Final polish pass
  const polishedDraft = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    maxTokens: 8000,
    prompt: `Polish and improve this blog post draft. Make sure it flows well, has good transitions between sections, maintains consistent tone, and reads as a cohesive piece at a college reading level.

Original Draft:
${fullDraft}

Please return the improved version that:
- Maintains all the core content and structure
- Improves transitions between sections and subsections
- Ensures consistent tone throughout
- Fixes any awkward phrasing
- Makes the overall piece more engaging and readable
- Ensures the content is dense with information and includes sufficient depth and detail
- Keeps the same markdown formatting
- Ensures headings are short, descriptive, and create natural flow
- Avoids generic language and creates a compelling narrative arc`,
  });

  return polishedDraft.text;
});

export { WriteDraft };
