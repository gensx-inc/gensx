import ReactMarkdown from "react-markdown";
import fs from "fs";
import path from "path";
import remarkGfm from "remark-gfm";
const getMarkdownContent = (relativePath: string): string => {
  const fullPath = path.join(process.cwd(), "app", relativePath);
  try {
    const fileContents = fs.readFileSync(fullPath, "utf8");
    return fileContents;
  } catch (error) {
    console.error(`Error reading markdown file at ${fullPath}:`, error);
    return `Error loading content from ${relativePath}.`;
  }
};

interface MarkdownRendererProps {
  relativePath: string;
}

export default function MarkdownRenderer({
  relativePath,
}: MarkdownRendererProps) {
  const markdown = getMarkdownContent(relativePath);

  return (
    <main className="container mx-auto px-8 pt-24 pb-16">
      <article className="prose prose-invert max-w-6xl lg:prose-lg dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </article>
    </main>
  );
}
