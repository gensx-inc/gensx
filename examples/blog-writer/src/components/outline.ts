import { anthropic } from "@ai-sdk/anthropic";
import * as gensx from "@gensx/core";
import { generateObject } from "@gensx/vercel-ai";
import { z } from "zod";

// TODO: take research and write an outline (structured output) for the blog post

interface OutlineProps {
  title: string;
  prompt: string;
  research?: {
    topics: string[];
    webResearch: {
      topic: string;
      content: string;
      citations: string[];
      source: string;
    }[];
  };
}

const SubsectionSchema = z.object({
  heading: z.string(),
  keyPoints: z.array(z.string()),
  researchTopics: z.array(z.string()).optional(),
});

const SectionSchema = z.object({
  heading: z.string(),
  keyPoints: z.array(z.string()),
  sectionType: z.enum(["introduction", "body", "conclusion"]).optional(),
  researchTopics: z.array(z.string()).optional(),
  subsections: z.array(SubsectionSchema).optional(),
});

const OutlineSchema = z.object({
  title: z.string(),
  sections: z.array(SectionSchema),
});

const WriteOutline = gensx.Component(
  "WriteOutline",
  async (props: OutlineProps) => {
    gensx.emitProgress("Creating article outline...");

    // Prepare research context
    const researchContext = props.research
      ? [
          "Research Topics:",
          ...props.research.topics.map((topic) => `- ${topic}`),
          "",
          "Web Research Findings:",
          ...props.research.webResearch.map(
            (item) => `${item.topic}: ${item.content.substring(0, 300)}...`,
          ),
          "",
        ].join("\n")
      : "";

    const result = await generateObject({
      model: anthropic("claude-sonnet-4-20250514"),
      schema: OutlineSchema,
      maxTokens: 4000,
      prompt: `You are an expert content writer, and you are assisting me in writing an article titled "${props.title}". Your task is to write an outline for the article, taking into account the research you have done.

Here are some notes about how I would like this article to be written:
${props.prompt}

${researchContext ? `Here is the research you have conducted:\n${researchContext}\n` : ""}

Think carefully about the user's request, and consider these important aspects of an article:
- An interesting and engaging narrative arc that ensures the reader finds the article interesting and valuable.
- A strong introduction that grabs the reader's attention and states the "what" and the "why" of the article.
- A clear and concise body that presents the information in a logical and engaging manner including code examples and other resources.
- End the article with a purposeful section that reinforces the key message and includes a call to action. Don't just end with a generic "Conclusion".
- Write articles at a college reading level. Articles should be dense with information and include sufficient depth and detail.
- Ensure that the headings are short, descriptive, and create a natural flow for the article. Avoid words like "Maximizing", "Mastering" or "Harnessing" in headings.

DO NOT actually write the article yet. Just construct a detailed outline for the article.

Here is a simple example to demonstrate how to structure the outline. This example is only demonstrating the format for the output, not the content. Feel free to include as many or as few sections as you need, as well as any sub-sections that make sense for the article.
The outline that you produce should be detailed and comprehensive, reflecting the research you have done and a deep level of detail that is necessary for the article.

{
  "title": "Example Article Outline",
  "sections": [
    {
      "heading": "A heading for the first section",
      "keyPoints": [
        "The heading should not start with \\"Introduction\\", but should instead catch the reader's attention and set the stage for the article",
        "Start with a strong opening sentence that grabs the reader's attention",
        "Provide some context for the topic, setting the stage for what's to come"
      ],
      "sectionType": "introduction",
      "researchTopics": [
        "Provide a list of topics that should be further researched before writing this section",
        "These might be things that are already in the research, but need more detail"
      ]
    },
    {
      "heading": "A heading for the body section",
      "keyPoints": [
        "Use subsections to break up the article into logical sections",
        "Each section should focus on a specific aspect of the topic, building up to a comprehensive understanding of the subject",
        "If it makes sense to include one or more code samples for a section, mention it here in the 'keyPoints' field"
      ],
      "researchTopics": [
        "The research topics help guide the writer on what to think about while writing this section"
      ],
      "subsections": [
        {
          "heading": "A heading for the first section of the body",
          "keyPoints": [
            "Describe the first main point in detail",
            "Provide additional information or examples to further explain the main point"
          ],
          "researchTopics": [
            "Subsections can also have research topics"
          ]
        },
        {
          "heading": "A heading for the second section of the body",
          "keyPoints": [
            "Describe the second main point in detail",
            "Provide additional information or examples to further explain the main point"
          ],
          "researchTopics": [
            "Subsections can also have research topics, which guide the writer on what to think about while writing this subsection"
          ]
        }
      ]
    },
    {
      "heading": "The article will probably have several more sections like this",
      "keyPoints": [
        "The outline should be detailed and comprehensive, reflecting the research you have done and the depth of detail you will include in the article",
        "The outline should be written in a way that is easy to understand and follow, with a logical flow from one section to the next"
      ],
      "researchTopics": [
        "A research topic is related to the main points in the section, but may also be other topics that are related to the article as a whole"
      ],
      "subsections": [
        {
          "heading": "This subsection would elaborate on the points in the parent section",
          "keyPoints": [
            "Describe the subsection in detail",
            "Provide additional information or examples (maybe with code snippets) to further elaborate on the points in the parent section"
          ]
        }
      ]
    },
    {
      "heading": "A heading for the end of the article",
      "keyPoints": [
        "The heading should not start with \\"Conclusion\\", but should instead remind the reader of the main points of the article",
        "End with one or more strong closing paragraphs that leave a lasting impression on the reader, and includes links to documents with more information"
      ],
      "sectionType": "conclusion",
      "researchTopics": []
    }
  ]
}

Based on the research provided and the guidelines above, create a detailed, comprehensive outline for the article "${props.title}". Make sure to include specific keyPoints for each section that will guide the writing process, and include researchTopics that indicate what additional information should be considered when writing each section.`,
    });

    gensx.emitProgress(
      `Outline complete with ${result.object.sections.length} sections`,
    );
    return result;
  },
);

export { WriteOutline };
