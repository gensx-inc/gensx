/** @jsxImportSource @gensx/core */
"use server";

import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { GitHubProfile } from "./gensx/scrapeGithub";
import * as gensx from "@gensx/core";
import { ScrapeGitHubProfile } from "./gensx/scrapeGithub";
import { DeepJSXElement } from "../../../../packages/gensx-core/dist/types";

type Prize = "T-Shirt" | "Stickers" | "Mug" | "Hoodie" | "Hat";

interface PrizeOdds {
  name: Prize;
  probability: number;
}

interface SelectPrizeProps {
  prizes: PrizeOdds[];
}

const SelectPrize = gensx.Component<SelectPrizeProps, Prize>(
  "SelectPrize",
  async ({ prizes }) => {
    // wait 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const totalProbability = prizes.reduce(
      (acc, curr) => acc + curr.probability,
      0,
    );
    const randomValue = Math.random() * totalProbability;

    let cumulativeProbability = 0;

    for (const prize of prizes) {
      cumulativeProbability += prize.probability;
      if (randomValue <= cumulativeProbability) {
        return prize.name;
      }
    }
    return "Stickers"; // Default to stickers if none selected
  },
);

const WriteCongratulationsMessage = gensx.Component<
  { prize: Prize; profile: GitHubProfile },
  string
>("WriteCongratulationsMessage", async ({ prize, profile }) => {
  const systemMessage = `You're an AI assistant who works as a developer advocate at a startup called GenSX.
  GenSX is a typescript framework for building AI agents and workflows.

  You're working at a booth at a conference and announcing the prize that a user wins (like spinning a wheel!) given a prize and you need to write a poem about it.

  You will be given a prompt on how to share a prize a user gets. Make sure the response makes clear the prize and relates it to GenSX/AI/etc. `;

  return (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <ChatCompletion
        model="gpt-4o-mini"
        messages={[
          { role: "system", content: systemMessage },
          {
            role: "user",
            content: `Write a funny short sentence congratulating the user on their prize: a ${prize}

              Here are details about the user. Make sure to make the message personal to them: <github_profile> ${JSON.stringify(profile)}</github_profile>`,
          },
        ]}
      />
    </OpenAIProvider>
  );
});

export interface Info {
  profile: GitHubProfile;
  prize: Prize;
}

type InfoJsx = DeepJSXElement<Info>;

export interface SwagGiveawayOutput {
  prize: Prize;
  message: string;
  profile: GitHubProfile;
}

export interface SwagGiveawayProps {
  prizes: PrizeOdds[];
  username: string;
}

const SwagGiveaway = gensx.Component<SwagGiveawayProps, SwagGiveawayOutput>(
  "SwagGiveaway",
  async ({ prizes, username }) => {
    return (
      <ScrapeGitHubProfile username={username}>
        {(profile) => (
          <SelectPrize prizes={prizes}>
            {(prize) => (
              <WriteCongratulationsMessage prize={prize} profile={profile}>
                {(message) => {
                  return {
                    prize: prize,
                    message,
                    profile: profile,
                  };
                }}
              </WriteCongratulationsMessage>
            )}
          </SelectPrize>
        )}
      </ScrapeGitHubProfile>
    );
  },
);

const swagGiveawayWorkflow = gensx.Workflow(
  "SwagGiveawayWorkflow",
  SwagGiveaway,
);

export const runGiveawayWorkflow = swagGiveawayWorkflow.run;
