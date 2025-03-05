/** @jsxImportSource gensx */
"use server";

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

const WritePrizePoem = gsx.Component<{ prize: Prize }, string>(
  "WritePrizePoem",
  async ({ prize }) => {
    return `You won a ${prize}!`;
  },
);

const SwagGiveaway = gsx.Component<SelectPrizeProps, string>(
  "SwagGiveaway",
  async ({ prizes }) => {
    return (
      <SelectPrize prizes={prizes}>
        {(prize) => <WritePrizePoem prize={prize} />}
      </SelectPrize>
    );
  },
);

const swagGiveawayWorkflow = gsx.Workflow("SwagGiveawayWorkflow", SwagGiveaway);

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
