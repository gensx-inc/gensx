import * as gsx from "@/index";
import { promises as fs } from "fs";
import { getTopStoryDetails, type HNStory } from "./hn";

interface PGTweetWriterProps {
  context: string;
  prompt: string;
}

type PGTweetWriterOutput = string;
const PGTweetWriter = gsx.Component<PGTweetWriterProps, PGTweetWriterOutput>(
  async ({ context, prompt }) => {
    return await Promise.resolve(`PG tweet: ${prompt}`);
  },
);

interface BlogPostWriterProps {
  context: string;
  prompt: string;
}

type HNReportWriterOutput = string;
const HNReportWriter = gsx.Component<BlogPostWriterProps, HNReportWriterOutput>(
  async ({ prompt }) => {
    return await Promise.resolve(`PG tweet: ${prompt}`);
  },
);

interface PGEditorProps {
  content: string;
}

type PGEditorOutput = string;
const PGEditor = gsx.Component<PGEditorProps, PGEditorOutput>(
  async ({ content }) => {
    return await Promise.resolve(`PG tweet: ${content}`);
  },
);

interface CommentsAnalyzerProps {
  postId: string;
}

interface CommentsAnalyzerOutput {
  postId: string;
  demonstrativeComment: string;
  sentiment: string;
}
const CommentsAnalyzer = gsx.Component<
  CommentsAnalyzerProps,
  CommentsAnalyzerOutput
>(async ({ postId }) => {
  return await Promise.resolve({
    postId,
    demonstrativeComment: "This is a demonstrative comment",
    sentiment: "positive",
  });
});

interface PostSummarizerProps {
  postId: string;
}

type PostSummarizerOutput = string;
const PostSummarizer = gsx.Component<PostSummarizerProps, PostSummarizerOutput>(
  async ({ postId }) => {
    return await Promise.resolve(`Post summarizer: ${postId}`);
  },
);

interface HNPostAnalyzerProps {
  postId: string;
}

type HNPostAnalyzerOutput = [PostSummarizerOutput, CommentsAnalyzerOutput];

const HNPostAnalyzer = gsx.Component<HNPostAnalyzerProps, HNPostAnalyzerOutput>(
  async ({ postId }) => (
    <>
      <PostSummarizer postId={postId} />
      <CommentsAnalyzer postId={postId} />
    </>
  ),
);

interface HNCollectorProps {
  limit: number;
}

type HNCollectorOutput = HNStory[]; // Array of stories
const HNCollector = gsx.Component<HNCollectorProps, HNCollectorOutput>(
  async ({ limit }) => {
    console.log(`📚 Collecting ${limit} HN posts...`);
    return await getTopStoryDetails(limit);
  },
);

interface TrendAnalyzerProps {
  analyses: Array<[string, CommentsAnalyzerOutput]>; // Array of [summary, analysis]
}

interface TrendReport {
  positiveThemes: string[];
  negativeThemes: string[];
  surprisingThemes: string[];
  overallSentiment: string;
}

const TrendAnalyzer = gsx.Component<TrendAnalyzerProps, TrendReport>(
  async ({ analyses }) => {
    console.log("🔍 Analyzing trends across posts...");
    // In real implementation, this would use the LLM to analyze trends
    return {
      positiveThemes: ["Theme 1", "Theme 2"],
      negativeThemes: ["Theme 3"],
      surprisingThemes: ["Theme 4"],
      overallSentiment: "mostly positive",
    };
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
        <HNPostAnalyzer postId={story.title} />
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

interface HNAnalyzerWorkflowOutput {
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
              <PGEditor content={JSON.stringify(report)}>
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

// Main execution
export async function main() {
  console.log("🚀 Starting HN analysis workflow...");

  const { report, tweet } = await gsx.execute<HNAnalyzerWorkflowOutput>(
    <HNAnalyzerWorkflow postCount={500} />,
  );

  // Write outputs to files
  await fs.writeFile("hn_analysis_report.md", report);
  await fs.writeFile("hn_analysis_tweet.txt", tweet);

  console.log(
    "✅ Analysis complete! Check hn_analysis_report.md and hn_analysis_tweet.txt",
  );
}
