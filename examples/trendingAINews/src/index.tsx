import { gsx } from "gensx";
import { PerplexityDeepSeekR1Search } from "./perplexity.js";
import { SlackChannels } from "./slack.js";
import { SlackMessage } from "./slack.js";

type GetDomainsProps = {
  prompt: string;
};

type GetDomainsOutput = {
  domains: DomainInfo[];
};

const GetDomains = gsx.Component<GetDomainsProps, GetDomainsOutput>(
  "GetDomains",
  (props) => {
    const messages = [
      {
        role: "system" as const,
        content: `You are a lookup service that outputs JSON. The JSON must follow the schema provided in the response format. The format of the result should be a JSON object with a single key "domains" that contains an array of DomainInfo objects. A domain info object should have a name and a domain property and that's it. I.e. {"domains": [{"name": "Company Name", "domain": "Website Domain"}]}`,
      },
      {
        role: "user" as const,
        content: props.prompt,
      },
    ];

    return (
      <PerplexityDeepSeekR1Search
        messages={messages}
        response_format={{
          type: "json_schema",
          json_schema: {
            schema: {
              type: "object",
              properties: {
                domains: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", title: "Company Name" },
                      domain: { type: "string", title: "Website Domain" },
                    },
                    required: ["name", "domain"],
                    title: "DomainInfo",
                  },
                },
              },
              required: ["domains"],
              title: "DomainsResponse",
            },
          },
        }}
      >
        {(response) => {
          console.log("PerplexityDeepSeekR1Search response:", response);
          try {
            const parsed = JSON.parse(response.completion);
            const firstKey = Object.keys(parsed)[0];
            const domains = parsed[firstKey] as DomainInfo[];
            console.log("Domains:", domains);
            return domains;
          } catch (error) {
            console.error("Failed to parse domains response:", error);
            return { domains: [] };
          }
        }}
      </PerplexityDeepSeekR1Search>
    );
  },
);

const GetMajorLLMProviderDomains = gsx.Component<{}, DomainInfo[]>(
  "GetMajorLLMProviderDomains",
  (props) => (
    <GetDomains prompt="List the top 20 AI companies or providers serving LLMs. They can be startups or large companies." />
  ),
);

const GetMajorAINewsSourceDomains = gsx.Component<{}, DomainInfo[]>(
  "GetMajorAINewsSourceDomains",
  (props) => (
    <GetDomains prompt="Who are the top AI news sources in the LLM space? Include major news outlets, tech websites, and reputable sources covering AI and LLMs." />
  ),
);

type DomainInfo = {
  name: string;
  domain: string;
};

const GetAIDomains = gsx.Component<{}, GetDomainsOutput>("GetAIDomains", () => (
  <GetMajorLLMProviderDomains>
    {(llmDomains) => (
      <GetMajorAINewsSourceDomains>
        {(newsDomains) => ({
          domains: [...llmDomains, ...newsDomains],
        })}
      </GetMajorAINewsSourceDomains>
    )}
  </GetMajorLLMProviderDomains>
));

type GetLatestAINewsFromDomainProps = {
  recencyFilter?: "month" | "week" | "day" | "hour";
  domain: string;
  name: string;
};

type NewsArticle = {
  title: string;
  summary: string;
  url: string;
};

type NewsArticlesResponse = {
  articles: NewsArticle[];
  domain: string;
  name: string;
};

const GetLatestAINewsFromDomain = gsx.Component<
  GetLatestAINewsFromDomainProps,
  NewsArticlesResponse
>("GetLatestAINewsFromDomain", (props) => (
  <PerplexityDeepSeekR1Search
    messages={[
      {
        role: "user",
        content: `What are the latest AI news articles from ${props.name}? Please follow the format of the JSON schema. The format of the result should be a JSON object with a single key "articles" that contains an array of NewsArticle objects. A news article object should have a title, summary, and url property and that's it. I.e. {"articles": [{"title": "Article Title", "summary": "Article Summary", "url": "Article URL"}]}. IF there are no results simply return an empty array and no other commentary.`,
      },
    ]}
    search_recency_filter={props.recencyFilter || "day"}
    search_domain_filter={[props.domain]}
    response_format={{
      type: "json_schema",
      json_schema: {
        schema: {
          type: "object",
          properties: {
            articles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  summary: { type: "string" },
                  url: { type: "string" },
                },
                required: ["title", "summary", "url"],
              },
            },
          },
          required: ["articles"],
        },
      },
    }}
  >
    {({ completion }) => {
      try {
        const parsed = JSON.parse(completion);
        return {
          articles: parsed.articles || [],
          domain: props.domain,
          name: props.name,
        };
      } catch (error) {
        console.error(`Failed to parse response for ${props.name}:`, error);
        return {
          articles: [],
          domain: props.domain,
          name: props.name,
        };
      }
    }}
  </PerplexityDeepSeekR1Search>
));

type GetLatestAIArticlesFromDomainsProps = {
  domains: DomainInfo[];
};

type GetLatestAIArticlesFromDomainsOutput = {
  results: NewsArticlesResponse[];
};

const GetLatestAIArticlesFromDomains = gsx.Component<
  GetLatestAIArticlesFromDomainsProps,
  GetLatestAIArticlesFromDomainsOutput
>("GetLatestAIArticlesFromDomains", (props) => {
  return {
    results: props.domains.map((domainInfo) => (
      <GetLatestAINewsFromDomain
        domain={domainInfo.domain}
        name={domainInfo.name}
      />
    )),
  };
});

const SendArticlesToSlack = gsx.Component<
  { articles: NewsArticle[]; name: string },
  { message: string }
>("SendArticlesToSlack", ({ articles, name }) => {
  return (
    <SlackChannels>
      {({ channels }) => {
        const header = `🚀 AI and LLM Trends for ${new Date().toLocaleDateString()}\n\n`;
        const formattedArticles = articles
          .map(
            (article, index) =>
              `${index + 1}. **${article.title}|${article.summary}**\n - ${article.url}`,
          )
          .join("\n\n");

        return (
          <SlackMessage
            channelId={channels?.[1]?.id || ""}
            message={header + formattedArticles}
          />
        );
      }}
    </SlackChannels>
  );
});

const SendArticlesToSlackIndividual = gsx.Component<
  { articles: NewsArticle[]; name: string },
  { message: string }
>("SendArticlesToSlack", ({ articles, name }) => {
  return (
    <SlackChannels>
      {({ channels }) =>
        articles.map((article) => (
          <SlackMessage
            channelId={channels?.[1]?.id || ""}
            message={`*${article.title}|${article.summary}*\n - ${article.url}`}
          />
        ))
      }
    </SlackChannels>
  );
});

const TrendFinder = gsx.Component<{}, { results: NewsArticlesResponse[] }>(
  "TrendFinder",
  (props) => {
    return (
      <GetAIDomains>
        {({ domains }) => (
          <GetLatestAIArticlesFromDomains domains={domains}>
            {(results) => {
              // Flatten all articles from results into a single array
              const allArticles = results.results.flatMap(
                (result) => result.articles,
              );
              // Return the results
              return (
                <SendArticlesToSlack
                  articles={allArticles}
                  name="All Articles"
                />
              );
            }}
          </GetLatestAIArticlesFromDomains>
        )}
      </GetAIDomains>
    );
  },
);

const result = gsx.execute<{ news: NewsArticlesResponse[] }>(<TrendFinder />);

console.log(result);
