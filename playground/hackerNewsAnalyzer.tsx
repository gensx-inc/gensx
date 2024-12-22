import * as gsx from "@/index";
import { getTopStoryDetails, type HNStory } from "./hn";
import { createLLMService } from "../src/llm";

// Initialize LLM service
const llm = createLLMService({
  model: "gpt-4o",
  temperature: 0.7,
});

interface PGTweetWriterProps {
  context: string;
  prompt: string;
}

type PGTweetWriterOutput = string;
const PGTweetWriter = gsx.Component<PGTweetWriterProps, PGTweetWriterOutput>(
  async ({ context, prompt }) => {
    const PROMPT = `
You are Paul Graham composing a tweet. Given a longer analysis, distill it into a single tweet that:
1. Captures the most interesting insight
2. Uses your characteristic direct style
3. Provokes thought or discussion
4. Stays under 280 characters

Focus on the most surprising or counterintuitive point rather than trying to summarize everything.
    `.trim();

    const result = await llm.chat([
      { role: "system", content: PROMPT },
      { role: "user", content: `Context:\n${context}\n\nPrompt: ${prompt}` },
    ]);
    return result;
  },
);

interface PGEditorProps {
  content: string;
}

type PGEditorOutput = string;
const PGEditor = gsx.Component<PGEditorProps, PGEditorOutput>(
  async ({ content }) => {
    const PROMPT = `
You are Paul Graham, founder of Y Combinator and long-time essayist. Given a technical analysis, rewrite it in your distinctive style:
1. Clear, direct language
2. Concrete examples and analogies
3. Contrarian insights that challenge conventional wisdom
4. A focus on fundamental principles
5. Your characteristic mix of technical depth and philosophical breadth

Maintain your voice while preserving the key insights from the analysis.
    `.trim();

    const result = await llm.chat([
      { role: "system", content: PROMPT },
      { role: "user", content: content },
    ]);
    return result;
  },
);

interface CommentsAnalyzerProps {
  postId: string;
  comments: Array<{ text: string; score: number }>;
}

type CommentsAnalyzerOutput = string;

const CommentsAnalyzer = gsx.Component<
  CommentsAnalyzerProps,
  CommentsAnalyzerOutput
>(async ({ postId, comments }) => {
  const PROMPT = `
You are an expert at analyzing Hacker News discussions. Analyze the provided comments and output in this exact format:

SENTIMENT: [Write a single sentence describing the overall sentiment in 10 words or less]
DEMONSTRATIVE_COMMENT: [Select the single most insightful or representative comment, quoted exactly as provided]
ANALYSIS: [Your detailed analysis of key points of agreement/disagreement]

Example output:
SENTIMENT: Community is cautiously optimistic about the technical approach.
DEMONSTRATIVE_COMMENT: [Score: 42] The real innovation here is the combination of existing techniques.
ANALYSIS: The discussion shows strong agreement about scalability concerns...

Focus on substance rather than surface-level reactions. Quote the demonstrative comment exactly as provided in the input.
    `.trim();

  const commentsText = comments
    .map(c => `[Score: ${c.score}] ${c.text}`)
    .join("\n\n");

  return await llm.chat([
    { role: "system", content: PROMPT },
    { role: "user", content: commentsText },
  ]);
});

interface PostSummarizerProps {
  story: HNStory;
}

type PostSummarizerOutput = string;
const PostSummarizer = gsx.Component<PostSummarizerProps, PostSummarizerOutput>(
  async ({ story }) => {
    const PROMPT = `
You are an expert at summarizing Hacker News posts. Given a post's title, text, and comments, create a concise summary that captures:
1. The main point or key insight
2. Any notable discussion points from comments
3. The overall reception (based on score and comment sentiment)

Keep the summary clear and objective. Focus on facts and insights rather than opinions.
    `.trim();

    const context = `
Title: ${story.title}
Text: ${story.text}
Score: ${story.score}
Comments: ${story.comments.map(c => `[Score: ${c.score}] ${c.text}`).join("\n")}
    `.trim();

    const result = await llm.chat([
      { role: "system", content: PROMPT },
      { role: "user", content: context },
    ]);

    return result;
  },
);

interface HNPostAnalyzerProps {
  story: HNStory;
}

type HNPostAnalyzerOutput = [string, string]; // [summary, commentAnalysis]

const HNPostAnalyzer = gsx.Component<HNPostAnalyzerProps, HNPostAnalyzerOutput>(
  async ({ story }) => (
    <>
      <PostSummarizer story={story} />
      <CommentsAnalyzer postId={story.title} comments={story.comments} />
    </>
  ),
);

interface HNCollectorProps {
  limit: number;
}

type HNCollectorOutput = HNStory[]; // Array of stories
const HNCollector = gsx.Component<HNCollectorProps, HNCollectorOutput>(
  async ({ limit }) => {
    // We can only get up to 500 stories from the API
    const MAX_HN_STORIES = 500;
    const requestLimit = Math.min(limit, MAX_HN_STORIES);

    console.log(
      `📚 Collecting up to ${requestLimit} HN posts (text posts only)...`,
    );
    const stories = await getTopStoryDetails(requestLimit);
    console.log(
      `📝 Found ${stories.length} text posts out of ${requestLimit} total posts`,
      stories.length < limit
        ? `\n⚠️  Note: Requested ${limit} posts but only found ${stories.length} text posts in the top ${requestLimit} stories`
        : "",
    );

    return stories;
  },
);

interface TrendAnalyzerProps {
  analyses: Array<[string, string]>; // Array of [summary, commentAnalysis]
}

type TrendReport = string;

const TrendAnalyzer = gsx.Component<TrendAnalyzerProps, TrendReport>(
  async ({ analyses }) => {
    const PROMPT = `

You are writing a blog post for software engineers who work at startups and spend lots of time on twitter and hacker news.
You will be given input summarizing the top posts from hacker news, and an analysis of the comments on each post. 

You are to write a blog post about the top trends in technology based on this input. You should be sure to cover the following sections: 

- Positive themes: 3 ideas/technologies people are excited about
- Negative themes: 3 concerns or criticisms
- Surprising themes: 3 unexpected insights or connections
- Overall sentiment: a single sentence describing the overall mood of software developers as a whole. 

Where appropriate, you shoudl interleve demonstrative comments to help support your points, build connection with the reader, and make the post more engaging.

Shoot for 1000 words.
    `.trim();

    const context = analyses
      .map(([summary, analysis]) =>
        `
Post Summary: ${summary}
Comment Analysis: ${analysis}
    `.trim(),
      )
      .join("\n\n");

    return await llm.chat([
      { role: "system", content: PROMPT },
      { role: "user", content: context },
    ]);
  },
);

interface AnalyzeHNPostsProps {
  stories: HNStory[];
}

type AnalyzeHNPostsOutput = HNPostAnalyzerOutput[];

const AnalyzeHNPosts = gsx.Component<AnalyzeHNPostsProps, AnalyzeHNPostsOutput>(
  async ({ stories }) => (
    <>
      {stories.map(story => (
        <HNPostAnalyzer story={story} />
      ))}
    </>
  ),
);

interface CombineOutputProps {
  report: string;
  tweet: string;
}

const CombineOutput = gsx.Component<
  CombineOutputProps,
  HNAnalyzerWorkflowOutput
>(async ({ report, tweet }) => ({ report, tweet }));

interface HNAnalyzerWorkflowProps {
  postCount: number;
}

export interface HNAnalyzerWorkflowOutput {
  report: string;
  tweet: string;
}

export const HNAnalyzerWorkflow = gsx.Component<
  HNAnalyzerWorkflowProps,
  HNAnalyzerWorkflowOutput
>(async ({ postCount }) => (
  <HNCollector limit={postCount}>
    {stories => (
      <AnalyzeHNPosts stories={stories}>
        {postAnalyses => (
          <TrendAnalyzer analyses={postAnalyses}>
            {report => (
              <PGEditor content={report}>
                {editedReport => (
                  <PGTweetWriter
                    context={editedReport}
                    prompt="Summarize the HN trends in a tweet"
                  >
                    {tweet => (
                      <CombineOutput report={editedReport} tweet={tweet} />
                    )}
                  </PGTweetWriter>
                )}
              </PGEditor>
            )}
          </TrendAnalyzer>
        )}
      </AnalyzeHNPosts>
    )}
  </HNCollector>
));
