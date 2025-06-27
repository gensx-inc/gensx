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
        className="flex justify-between items-center text-slate-300 px-4 py-1 text-xs font-medium rounded-t-md border-b border-slate-900"
        style={{ backgroundColor: "#282c34" }}
      >
        <span className="lowercase tracking-wide">{language}</span>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-slate-700 px-2 py-1 rounded"
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
        className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-sm font-mono"
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
    return <div className="my-4">{children}</div>;
  },
  p({ children }) {
    return <p className="mb-2 last:mb-0 text-slate-800">{children}</p>;
  },
  ul({ children }) {
    return (
      <ul className="list-disc list-outside ml-4 mb-2 space-y-1">{children}</ul>
    );
  },
  ol({ children }) {
    return (
      <ol className="list-decimal list-outside ml-4 mb-2 space-y-1">
        {children}
      </ol>
    );
  },
  li({ children }) {
    return <li className="text-slate-800 py-1">{children}</li>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-4 border-slate-300 pl-4 italic text-slate-600 my-2">
        {children}
      </blockquote>
    );
  },
  h1({ children }) {
    return (
      <h1 className="text-3xl font-semibold mt-6 mb-2 text-slate-900">
        {children}
      </h1>
    );
  },
  h2({ children }) {
    return (
      <h2 className="text-2xl font-semibold mt-6 mb-2 text-slate-900">
        {children}
      </h2>
    );
  },
  h3({ children }) {
    return (
      <h3 className="text-xl font-semibold mt-6 mb-2 text-slate-900">
        {children}
      </h3>
    );
  },
  h4({ children }) {
    return (
      <h4 className="text-lg font-semibold mt-6 mb-2 text-slate-900">
        {children}
      </h4>
    );
  },
  h5({ children }) {
    return (
      <h5 className="text-base font-semibold mt-6 mb-2 text-slate-900">
        {children}
      </h5>
    );
  },
  h6({ children }) {
    return (
      <h6 className="text-sm font-semibold mt-6 mb-2 text-slate-900">
        {children}
      </h6>
    );
  },
  strong({ children }) {
    return <span className="font-semibold text-slate-900">{children}</span>;
  },
  em({ children }) {
    return <em className="italic">{children}</em>;
  },
  a({ children, href }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline"
      >
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-2">
        <table className="min-w-full border border-slate-200">{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-slate-50">{children}</thead>;
  },
  th({ children }) {
    return (
      <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-900">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="border border-slate-200 px-3 py-2 text-slate-800">
        {children}
      </td>
    );
  },
  hr() {
    return <hr className="border-t border-slate-200 my-4" />;
  },
};

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeRaw];

const NonMemoizedMarkdownContent = ({
  content,
  className = "",
}: MarkdownContentProps) => {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
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
