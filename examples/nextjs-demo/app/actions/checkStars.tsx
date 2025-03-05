/** @jsxImportSource @gensx/core */
"use server";

import { Component, Workflow } from "@gensx/core";
import fetch from "node-fetch";
import { GSXChatCompletion, OpenAIProvider } from "@gensx/openai";
import { z } from "zod";
// 1. Component that fetches data from a website
interface FetchWebsiteProps {
  url: string;
}
type FetchWebsiteOutput = string;

const FetchWebsite = Component<FetchWebsiteProps, FetchWebsiteOutput>(
  "FetchWebsite",
  async ({ url }) => {
    const response = await fetch(url);
    const data = await response.text();
    return data;
  },
);

// Helper function to extract relevant a tags from HTML
function extractRelevantATags(html: string): string {
  // Simple regex to extract a tags that likely contain stargazer information
  const regex =
    /<a\s+class="[^"]*d-inline-block[^"]*"\s+data-hovercard-type="user"[^>]*>[\s\S]*?<\/a>/g;
  const matches = html.match(regex) || [];

  // Join all matches into a single string
  return matches.join("\n");
}

// 2. Component that processes raw data into stargazer data
interface ProcessStargazersProps {
  rawHtml: string;
}
// Simplified Stargazer interface with only username
interface Stargazer {
  username: string;
}
interface ProcessStargazersOutput {
  stargazers: Stargazer[];
}

const ProcessStargazers = Component<
  ProcessStargazersProps,
  ProcessStargazersOutput
>("ProcessStargazers", async ({ rawHtml }) => {
  // Extract only the relevant a tags before processing
  const relevantHtml = extractRelevantATags(rawHtml);
  console.log(
    "Extracted relevant HTML:",
    relevantHtml.substring(0, 500) + "...",
  );

  const StargazerListSchema = z.object({
    stargazers: z.array(z.object({ username: z.string() })),
  });

  return (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY || ""}>
      <GSXChatCompletion
        model="gpt-4o-mini"
        outputSchema={StargazerListSchema}
        messages={[
          {
            role: "system",
            content: `Extract GitHub usernames from the stargazers page HTML.

Look specifically for HTML elements that look somewhat like this:
<a class="d-inline-block" data-hovercard-type="user" data-hovercard-url="/users/USERNAME/hovercard" data-octo-click="hovercard-link-click" data-octo-dimensions="link_type:self" href="/USERNAME">
  <img class="avatar avatar-user" src="https://avatars.githubusercontent.com/u/USERID?s=96&v=4" width="48" height="48" alt="@USERNAME" />
</a>

The username is found in the href attribute (/USERNAME) and in the alt attribute (@USERNAME).
Return a JSON array of objects with only the username property (without the @ symbol).`,
          },
          {
            role: "user",
            content: `Extract all stargazer usernames from these GitHub page HTML elements: ${relevantHtml}`,
          },
        ]}
      />
    </OpenAIProvider>
  );
});

// 3. Component that combines fetching and processing for GitHub stargazers
interface GetRepoStargazersProps {
  repoPath: string; // Format: "org/repo-name"
}
interface GetRepoStargazersOutput {
  stargazers: Stargazer[];
}

const GetRepoStargazers = Component<
  GetRepoStargazersProps,
  GetRepoStargazersOutput
>("GetRepoStargazers", async ({ repoPath }) => {
  const url = `https://github.com/${repoPath}/stargazers`;

  // First fetch the HTML
  const htmlData = await FetchWebsite.run({ url });

  // Then process the HTML to extract stargazers
  const stargazers = await ProcessStargazers.run({ rawHtml: htmlData });

  return stargazers;
});

// Main workflow component with OpenAIProvider
const WorkflowComponent = Component<
  { repoPath: string },
  GetRepoStargazersOutput
>("StargazersWorkflow", ({ repoPath }) => (
  <OpenAIProvider apiKey={process.env.OPENAI_API_KEY || ""}>
    <GetRepoStargazers repoPath={repoPath} />
  </OpenAIProvider>
));

const checkStars = Workflow("GitHubStargazersWorkflow", WorkflowComponent);

export const checkStarsWorkflow = checkStars.run;

// // Example usage
// const result = await workflow.run(
//   {
//     repoPath: "gensx-inc/gensx",
//   },
//   { printUrl: true },
// );

// console.log(result);

// Note: This code uses JSX syntax which requires proper JSX runtime configuration.
// If you encounter errors, you may need to configure the TypeScript compiler options
// to support JSX with the appropriate JSX factory.
