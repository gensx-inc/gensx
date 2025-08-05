export interface Example {
  name: string;
  description: string;
  path: string;
  category?: string;
}

export const SUPPORTED_EXAMPLES: Example[] = [
  {
    name: "chat-ux",
    description:
      "Chat app with streaming, thinking, tool calling, and thread history built in.",
    path: "gensx-inc/chat-ux-template",
    category: "Next.js",
  },
  {
    name: "deep-research",
    description:
      "A deep research tool that writes detailed reports on any topic.",
    path: "gensx-inc/deep-research-template",
    category: "Next.js",
  },
  {
    name: "draft-pad",
    description:
      "A real-time collaborative draft writer and editor with versioning and diffing.",
    path: "gensx-inc/draft-pad-template",
    category: "Next.js",
  },
  {
    name: "client-side-tools",
    description:
      "An app demonstrating how to call tools on the client side to build interactive apps.",
    path: "gensx-inc/client-side-tools-template",
    category: "Next.js",
  },
];

export function getExampleByName(name: string): Example | undefined {
  return SUPPORTED_EXAMPLES.find((example) => example.name === name);
}

export function getExampleNames(): string[] {
  return SUPPORTED_EXAMPLES.map((example) => example.name);
}

export function getExamplesByCategory(category: string): Example[] {
  return SUPPORTED_EXAMPLES.filter((example) => example.category === category);
}

export function getCategories(): string[] {
  const categories = new Set(
    SUPPORTED_EXAMPLES.map((example) => example.category).filter(
      (category): category is string => Boolean(category),
    ),
  );
  return Array.from(categories).sort();
}
