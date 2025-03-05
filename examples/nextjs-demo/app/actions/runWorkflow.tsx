/** @jsxImportSource gensx */
"use server";

import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx } from "gensx";

type Prize = "T-Shirt" | "Stickers" | "Mug" | "Hoodie" | "Hat";

interface PrizeOdds {
  name: Prize;
  probability: number;
}

interface SelectPrizeProps {
  prizes: PrizeOdds[];
}

const SelectPrize = gsx.Component<SelectPrizeProps, Prize>(
  "SelectPrize",
  async ({ prizes }) => {
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

const WriteCongratulationsMessage = gsx.Component<{ prize: Prize }, string>(
  "WriteCongratulationsMessage",
  async ({ prize }) => {
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
              content: `Write a funny short sentence congratulating the user on their prize: a ${prize}`,
            },
          ]}
        />
      </OpenAIProvider>
    );
  },
);

const WriteJoke = gsx.Component<{ prize: string }, string>(
  "WriteJoke",
  async ({ prize }) => {
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
              content: `Write a super short joke about how the person at the booth should use their prize, a ${prize}`,
            },
          ]}
        />
      </OpenAIProvider>
    );
  },
);

export interface SwagGiveawayOutput {
  prize: Prize;
  message: string;
  joke: string;
}

const SwagGiveaway = gsx.Component<SelectPrizeProps, SwagGiveawayOutput>(
  "SwagGiveaway",
  async ({ prizes }) => {
    return (
      <SelectPrize prizes={prizes}>
        {(prize) => {
          return {
            prize,
            message: <WriteCongratulationsMessage prize={prize} />,
            joke: <WriteJoke prize={prize} />,
          };
        }}
      </SelectPrize>
    );
  },
);

const swagGiveawayWorkflow = gsx.Workflow(
  "SwagGiveawayWorkflow",
  SwagGiveaway,
  {
    printUrl: true,
  },
);

// export const runGiveawayWorkflow = async () => {
//   const prizes: PrizeOdds[] = [
//     { name: "T-Shirt", probability: 0.5 },
//     { name: "Stickers", probability: 0.3 },
//     { name: "Mug", probability: 0.1 },
//   ];
//   const result = await swagGiveawayWorkflow.run({ prizes });
//   return result;
// };

export const runGiveawayWorkflow = swagGiveawayWorkflow.run;
