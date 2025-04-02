import * as gensx from "@gensx/core";
import fetch from "node-fetch";
import { Parser } from "xml2js";

interface RawArxivEntry {
  title?: string[];
  summary?: string[];
  id?: string[];
  published?: string[];
  updated?: string[];
}

export interface ArxivEntry {
  title: string;
  summary: string;
  url: string;
  published: string;
  updated: string;
}

export interface SearchArxivProps {
  query: string;
  maxResults?: number;
}

export const SearchArxiv = gensx.Component<SearchArxivProps, ArxivEntry[]>(
  "SearchArxiv",
  async ({ query, maxResults = 10 }) => {
    const queryUrl = `https://export.arxiv.org/api/query?search_query=all:${query}&start=0&max_results=${maxResults}`;
    const response = await fetch(queryUrl);

    if (!response.ok) {
      throw new Error(
        `ArXiv API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const xml = await response.text();

    const parser = new Parser();
    const parsedResult = await parser.parseStringPromise(xml);

    const entries: ArxivEntry[] = (parsedResult.feed.entry ?? []).map(
      (entry: RawArxivEntry) => ({
        title: entry.title?.[0] ?? "",
        summary: entry.summary?.[0] ?? "",
        url: entry.id?.[0] ?? "",
        published: entry.published?.[0] ?? "",
        updated: entry.updated?.[0] ?? "",
      }),
    );

    return entries;
  },
);
