"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import prismStyle from "react-syntax-highlighter/dist/esm/styles/prism/prism";

type CodeBlockProps = {
  code: string;
  language?: string;
  className?: string;
  font?: "mono" | "sans";
};

export function CodeBlock({
  code,
  language = "tsx",
  className,
  font = "mono",
}: CodeBlockProps) {
  return (
    <SyntaxHighlighter
      language={language}
      style={prismStyle}
      wrapLongLines
      customStyle={{
        borderRadius: 8,
        padding: 16,
        background: "#f6f8fa",
        fontSize: 14,
        lineHeight: 1.6,
        margin: 0,
      }}
      className={[
        "rounded-lg overflow-auto",
        font === "mono" ? "font-mono" : "font-sans",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {code.trim()}
    </SyntaxHighlighter>
  );
}

export default CodeBlock;
