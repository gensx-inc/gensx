import ReactMarkdown, { type Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useState, memo } from "react";
import { Copy, Check } from "lucide-react";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

interface CodeBlockProps {
  language: string;
  children: string;
}

function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="relative group">
      {/* Header with language and copy button */}
      <div
        className="flex justify-between items-center text-zinc-300 px-4 py-1 text-xs font-medium rounded-t-md border-b border-zinc-900"
        style={{ backgroundColor: "#282c34" }}
      >
        <span className="lowercase tracking-wide">{language}</span>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-zinc-700 px-2 py-1 rounded"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={14} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        className="!mt-0 !rounded-t-none rounded-b-md text-xs"
        customStyle={{
          margin: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

const components: Partial<Components> = {
  code(props) {
    const { className, children, ...rest } = props;
    const match = /language-(\w+)/.exec(className || "");
    const isInline = !match;

    return isInline ? (
      <code
        className="bg-zinc-700 text-zinc-200 px-1 py-0.5 rounded text-xs font-mono"
        {...rest}
      >
        {children}
      </code>
    ) : (
      <CodeBlock language={match[1]}>
        {String(children).replace(/\n$/, "")}
      </CodeBlock>
    );
  },
  pre({ children }) {
    return <div className="my-3 text-xs">{children}</div>;
  },
  p({ children }) {
    return <p className="mb-2 last:mb-0 text-zinc-400 text-base">{children}</p>;
  },
  ul({ children }) {
    return (
      <ul className="list-disc list-outside ml-4 mb-1 space-y-0.5 text-base text-zinc-400">
        {children}
      </ul>
    );
  },
  ol({ children }) {
    return (
      <ol className="list-decimal list-outside ml-4 mb-1 space-y-0.5 text-base text-zinc-400">
        {children}
      </ol>
    );
  },
  li({ children }) {
    return <li className="text-zinc-400 py-0.5 text-base">{children}</li>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-4 border-zinc-600 pl-4 italic text-zinc-500 my-1 text-base">
        {children}
      </blockquote>
    );
  },
  h1({ children }) {
    return (
      <h1 className="text-2xl font-semibold mt-4 mb-1 text-zinc-300">
        {children}
      </h1>
    );
  },
  h2({ children }) {
    return (
      <h2 className="text-xl font-semibold mt-4 mb-1 text-zinc-300">
        {children}
      </h2>
    );
  },
  h3({ children }) {
    return (
      <h3 className="text-lg font-semibold mt-3 mb-1 text-zinc-300">
        {children}
      </h3>
    );
  },
  h4({ children }) {
    return (
      <h4 className="text-base font-semibold mt-3 mb-1 text-zinc-300">
        {children}
      </h4>
    );
  },
  h5({ children }) {
    return (
      <h5 className="text-sm font-semibold mt-2 mb-1 text-zinc-300">
        {children}
      </h5>
    );
  },
  h6({ children }) {
    return (
      <h6 className="text-xs font-semibold mt-2 mb-1 text-zinc-300">
        {children}
      </h6>
    );
  },
  strong({ children }) {
    return <span className="font-semibold text-zinc-300/85">{children}</span>;
  },
  em({ children }) {
    return <em className="italic">{children}</em>;
  },
  a({ children, href }) {
    // If the link text is a single number in brackets (citation)
    const isCitation =
      (typeof children === "string" && /^\[\d+\]$/.test(children.trim())) ||
      (Array.isArray(children) &&
        children.length === 1 &&
        typeof children[0] === "string" &&
        /^\[\d+\]$/.test(children[0].trim()));

    const citationNumber =
      typeof children === "string"
        ? children.replace(/^\[(\d+)\]$/, "$1")
        : Array.isArray(children) && typeof children[0] === "string"
          ? children[0].replace(/^\[(\d+)\]$/, "$1")
          : null;

    if (isCitation && citationNumber) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-1 py-0.25 mb-1 rounded bg-zinc-700/60 text-zinc-300 text-[10.5px] font-mono transition-colors hover:bg-zinc-700"
          style={{ verticalAlign: "middle" }}
        >
          {citationNumber}
        </a>
      );
    }

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-500 hover:text-slate-700 underline text-sm"
      >
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-1">
        <table className="min-w-full border border-zinc-700 text-base text-zinc-400">
          {children}
        </table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-zinc-800">{children}</thead>;
  },
  th({ children }) {
    return (
      <th className="border border-zinc-700 px-2 py-1 text-left font-semibold text-zinc-600 text-base">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="border border-zinc-700 px-2 py-1 text-zinc-500 text-base">
        {children}
      </td>
    );
  },
  hr() {
    return <hr className="border-t border-zinc-700 my-2" />;
  },
};

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeRaw];

const NonMemoizedMarkdownContent = ({
  content,
  className = "",
}: MarkdownContentProps) => {
  return (
    <div
      className={`prose prose-sm max-w-none ${className}`}
      style={{ fontSize: "1.05em" }}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export const MarkdownContent = memo(
  NonMemoizedMarkdownContent,
  (prevProps, nextProps) =>
    prevProps.content === nextProps.content &&
    prevProps.className === nextProps.className,
);
