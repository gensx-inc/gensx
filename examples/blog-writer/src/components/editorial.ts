import { anthropic } from "@ai-sdk/anthropic";
import * as gensx from "@gensx/core";
import { generateText } from "@gensx/vercel-ai";

// Editorial agent that takes the blog post and makes it more interesting
// Citations from research are preserved throughout the workflow

interface EditorialProps {
  title: string;
  prompt: string;
  draft?: string;
  targetWordCount?: number;
}

interface MatchToneProps {
  title: string;
  content: string;
  referenceURL: string;
}

const MatchTone = gensx.Component(
  "MatchTone",
  async (props: MatchToneProps) => {
    gensx.publishData("Matching tone to reference content...");

    // Fetch the reference content from the URL
    let referenceContent = "";
    try {
      const response = await fetch(props.referenceURL);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch reference content: ${response.statusText}`,
        );
      }
      referenceContent = await response.text();
    } catch (error) {
      console.warn("Failed to fetch reference content:", error);
      // If we can't fetch the reference, return the original content
      gensx.publishData("Reference content unavailable, returning original");
      return props.content;
    }

    const result = await generateText({
      model: anthropic("claude-opus-4-20250514"),
      maxTokens: 8000,
      prompt: `You are an expert editor specializing in style and tone matching. Your task is to revise a blog post to match the writing style and tone of a reference piece while preserving all the technical content and key information.

## Reference Content (for style and tone analysis):
${referenceContent}

## Blog Post to Revise:
${props.content}

## Instructions:

Analyze the reference content to understand:
1. **Writing Style**: Sentence structure, paragraph length, use of technical terms, formality level
2. **Tone**: Conversational vs. formal, enthusiastic vs. measured, authoritative vs. accessible
3. **Voice**: First person vs. third person, active vs. passive voice preferences
4. **Structure**: How sections flow, use of transitions, introduction and conclusion patterns
5. **Technical Communication**: How complex concepts are explained, use of examples and analogies

Then revise the blog post to match these stylistic elements while:
- Preserving all technical accuracy and key information
- Maintaining the logical flow and structure of the original content
- Keeping all code examples, links, and citations intact
- Ensuring the revised content feels natural and cohesive

Focus on:
- Adjusting sentence length and complexity to match the reference
- Matching the level of formality/informality
- Adopting similar transition phrases and connecting words
- Aligning the overall tone and personality
- Maintaining consistency throughout the entire piece

Return only the revised blog post content with the matched style and tone.`,
    });

    gensx.publishData("Tone matching complete");
    return result.text;
  },
);

const Editorial = gensx.Component(
  "Editorial",
  async (props: EditorialProps) => {
    if (!props.draft) {
      return "No draft provided - cannot perform editorial review.";
    }

    gensx.publishData("Editing your blog post...");

    const editorialReview = await generateText({
      model: anthropic("claude-opus-4-20250514"),
      maxTokens: 8000,
      prompt: `Consider how you can improve the article. Your goal is to improve the writing and flow of the article. The draft was written by several different people so you might need to tweak things to make sure it flows well. Try to keep all of the core information from the first draft in the article. Review all of the instructions below and then help us rewrite the article.

🎯 CRITICAL WORD COUNT REQUIREMENT: The final article must be approximately ${props.targetWordCount ?? 1500} words total. This is a strict requirement - you must aggressively cut content to meet this limit while preserving quality and key information.

## High level instructions
- Keep all of the links in the article. Links are very important to the quality of the article.
- Keep all of the information from the first draft in the article. We want articles to be dense with information but also have a good flow and be appealing to readers.
- DO NOT convert any prose into bullet points unless absolutely necessary.
- Do not include a heading immediately after the title. There should be a title, a brief introduction, and then the rest of the article.
- Make sure introduction is engaging and grabs the reader's attention. It should state the "what" and the "why" of the article. It shouldn't be more than two paragraphs, but it should relate the article to a real world scenario.
- Make good use of headings and subheadings while avoiding having too many short sections.
- End the article with a purposeful section that reinforces the key message rather than a generic "Conclusion". Keep conclusions punchy.
- Rewrite content that is too verbose or wordy. Prefer simpler sentences that are easy to read while still maintaining the depth of information.

## Stylistic Guidelines
Unless you are instructed otherwise, leverage the following tips on good writing:
- Limit the use of bulleted or numeric lists. There should be at most one list per every three sections.
- Write articles at a college reading level. Articles should be dense with information and include significant depth and detail.
- Avoid fluff and repetitive content. The rate at which an article reveals new information is important for keeping users engaged.
- Avoid using language that is too flowery. Avoid words and phrases like supercharging, meticulously, navigating, complexities, realm, demistifying, crucial, unveiling, shall, tailored, underpins, everchanging, ever-evolving, treasure, the world of, designed to enhance, it is advisable, daunting, in the realm of, amongst, upon, unveil the secrets. DO NOT start articles with something like 'in today's digital landscape'.
- It's especially important to avoid using flowery language in titles and headings. Avoid words like "Maximizing", "Mastering" or "Harnessing".
- Avoid using buzzwords and business jargon.

Guidelines for quality writing:
- **Use Short Sentences:** Keep sentences under 30 words to enhance readability and comprehension. Language should be concise, use fewer words and simpler sentences where possible over longer more complex ones.
- **Eliminate Weasel Words:** Remove vague language and weasel words like "may," "might," or "could" to strengthen your message.
- **Apply the "So-What" Test:** Ensure each point conveys a clear purpose or message, prompting the reader to understand why it's important. If a sentence is does not provide value, you can remove it as long as flow is maintained.
- **Avoid Adverbs and Unnecessary Qualifiers:** Eliminate adverbs and phrases like "very," "really," "I think," or "it seems" for more direct and decisive writing.
- **Be Objective and Avoid Jargon:** Use clear, accessible language free of jargon and to include all readers, regardless of their expertise.
- **Use Subject-Verb-Object Structure:** Construct sentences in a subject-verb-object order for clarity and conciseness.
- **Simplify Language:** Avoid unnecessary or complex words and phrases, opting for straightforward and easy-to-understand language.

Remember, it is very important that you match the tone and writing style of the examples.

Do not write anything before the article. Just write the article.

Original Draft:
${props.draft}

Original Context: ${props.prompt}

⚠️ FINAL CRITICAL REMINDER: The output must be approximately ${props.targetWordCount ?? 1500} words total. This is non-negotiable. Cut ruthlessly to meet this word count while preserving the most important information. Every word must earn its place.`,
    });

    gensx.publishData("Editorial review complete");
    return editorialReview.text;
  },
);

export { Editorial, MatchTone };
