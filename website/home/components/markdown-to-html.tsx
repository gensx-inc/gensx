"use client";

import React from "react";
import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/vs.css";  // Using Visual Studio light theme for good contrast

interface CodeComponentProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}
// This
export default function MarkdownToHTML({ markdown, className }: { markdown: string; className?: string }) {
  return (
    <div className="[&_pre]:overflow-x-auto [&_pre]:bg-white [&_pre]:rounded-[0px] [&_pre]:max-w-[95vw] md:[&_pre]:max-w-[85vw]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        className={className}
        components={{
          code(props: CodeComponentProps) {
            const { inline, children, className, ...rest } = props;
            const language = className?.replace('hljs language-', '');
            
            if (inline) {
              return (
                <code className="text-sm" {...rest}>
                  {children}
                </code>
              );
            }

            return (
              <div className="relative border border-gray-200">
                {language && (
                  <div className="absolute right-4 top-2 text-xs font-mono text-gray-800 z-10">
                    {language}
                  </div>
                )}
                <pre className="bg-white rounded-[0px] w-full px-2">
                  <code {...rest} className={`${className} text-xs md:text-sm leading-relaxed`}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          }
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
