"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import "highlight.js/styles/github.css";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

// Custom component to render the styled image using CSS instead of nested divs
const StyledImage = (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
  <span className="block my-4 border border-gray-300 p-1">
    <Image
      src={props.src?.toString() || ""}
      alt={props.alt || ""}
      width={typeof props.width === "number" ? props.width : 1200}
      height={typeof props.height === "number" ? props.height : 630}
      className="w-full h-auto"
      unoptimized={!props.src?.toString().startsWith("/")}
    />
  </span>
);

export default function MarkdownToHTML({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeHighlight]]}
      className={className}
      components={{
        p(props) {
          const { children, ...rest } = props;

          // Check if children contains only an image
          const childArray = React.Children.toArray(children);
          if (childArray.length === 1) {
            const onlyChild = childArray[0];
            if (React.isValidElement(onlyChild) && onlyChild.type === "img") {
              // Return the StyledImage component directly with properly typed props
              return (
                <StyledImage
                  {...(onlyChild.props as React.ImgHTMLAttributes<HTMLImageElement>)}
                />
              );
            }
          }

          return <p {...rest}>{children}</p>;
        },

        img(props) {
          return <StyledImage {...props} />;
        },

        ul(props) {
          return <ul className="list-disc list-inside my-4" {...props} />;
        },

        ol(props) {
          return <ol className="list-decimal mx-4" {...props} />;
        },

        li(props) {
          return <li className="my-1" {...props} />;
        },

        code(props) {
          const { children, className } = props;
          // If classname is found, it's a code block, not inline code
          if (className) {
            return <code {...props} className={`${className}`} />;
          }
          // Inline code
          return <code className="!rounded-none text-sm">{children}</code>;
        },

        pre(props) {
          const { children } = props;
          return (
            <span className="block my-4 border border-gray-300">
              <pre className="bg-white w-full p-4 whitespace-pre-wrap break-words font-mono text-sm">
                {children}
              </pre>
            </span>
          );
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
