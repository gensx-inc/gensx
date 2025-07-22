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
      "A complete chat interface with modern UX patterns, including message history, typing indicators, and responsive design.",
    path: "examples/chat-ux",
    category: "Next.js",
  },
  {
    name: "deep-research",
    description:
      "AI-powered research tool that can search the web, analyze documents, and compile comprehensive research reports.",
    path: "examples/deep-research",
    category: "Next.js",
  },
  {
    name: "draft-pad",
    description:
      "Collaborative writing and editing platform with real-time collaboration, version control, and AI assistance.",
    path: "examples/draft-pad",
    category: "Next.js",
  },
  {
    name: "client-side-tools",
    description:
      "Collection of client-side AI tools and utilities for various tasks like text processing, data analysis, and more.",
    path: "examples/client-side-tools",
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
