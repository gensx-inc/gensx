import * as gensx from "@gensx/core";
import { SearchResult } from "../types";
import { CohereClientV2 } from "cohere-ai";

const cohere = new CohereClientV2({
  token: process.env.COHERE_API_KEY,
});

interface RankParams {
  prompt: string;
  documents: SearchResult[];
}

export const Rank = gensx.Component(
  "Rank",
  async ({ prompt, documents }: RankParams) => {
    const rankedResults = await cohere.rerank({
      query: prompt,
      documents: documents.map(
        (result) => result.title + "\n\n" + result.description,
      ),
      model: "rerank-v3.5",
    });

    return rankedResults.results.map((result) => ({
      ...documents[result.index],
      relevanceScore: result.relevanceScore,
    }));
  },
);
