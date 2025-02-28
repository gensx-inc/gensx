"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import "highlight.js/styles/github.css";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

// Custom component to render the styled image using CSS instead of nested divs
const StyledImage = (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
  <span className="block relative my-2 w-full before:content-[''] before:absolute before:left-0 before:top-0 before:w-[30px] before:h-[1px] before:bg-gray-800 before:z-10 after:content-[''] after:absolute after:left-0 after:top-0 after:w-[1px] after:h-[30px] after:bg-gray-800 after:z-10">
    <span className="block relative before:content-[''] before:absolute before:right-0 before:top-0 before:w-[30px] before:h-[1px] before:bg-gray-800 before:z-10 after:content-[''] after:absolute after:right-0 after:top-0 after:w-[1px] after:h-[30px] after:bg-gray-800 after:z-10">
      <span className="block relative before:content-[''] before:absolute before:left-0 before:bottom-0 before:w-[30px] before:h-[1px] before:bg-gray-800 before:z-10 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-[1px] after:h-[30px] after:bg-gray-800 after:z-10">
        <span className="block relative before:content-[''] before:absolute before:right-0 before:bottom-0 before:w-[30px] before:h-[1px] before:bg-gray-800 before:z-10 after:content-[''] after:absolute after:right-0 after:bottom-0 after:w-[1px] after:h-[30px] after:bg-gray-800 after:z-10">
          <span className="block relative border-t border-b border-gray-200">
            <span className="block relative border-l border-r border-gray-200 my-[0px]">
              <Image
                src={props.src || ""}
                alt={props.alt || ""}
                width={typeof props.width === "number" ? props.width : 1200}
                height={typeof props.height === "number" ? props.height : 630}
                className="w-full h-auto"
                unoptimized={!props.src?.startsWith("/")}
              />
            </span>
          </span>
        </span>
      </span>
    </span>
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
            <span className="block relative mt-2 mb-1 w-full before:content-[''] before:absolute before:left-0 before:top-0 before:w-[30px] before:h-[1px] before:bg-gray-800 before:z-10 after:content-[''] after:absolute after:left-0 after:top-0 after:w-[1px] after:h-[30px] after:bg-gray-800 after:z-10">
              <span className="block relative before:content-[''] before:absolute before:right-0 before:top-0 before:w-[30px] before:h-[1px] before:bg-gray-800 before:z-10 after:content-[''] after:absolute after:right-0 after:top-0 after:w-[1px] after:h-[30px] after:bg-gray-800 after:z-10">
                <span className="block relative before:content-[''] before:absolute before:left-0 before:bottom-0 before:w-[30px] before:h-[1px] before:bg-gray-800 before:z-10 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-[1px] after:h-[30px] after:bg-gray-800 after:z-10">
                  <span className="block relative before:content-[''] before:absolute before:right-0 before:bottom-0 before:w-[30px] before:h-[1px] before:bg-gray-800 before:z-10 after:content-[''] after:absolute after:right-0 after:bottom-0 after:w-[1px] after:h-[30px] after:bg-gray-800 after:z-10">
                    <span className="block relative border-t border-b border-gray-200">
                      <span className="block relative border-l border-r border-gray-200">
                        <pre className="bg-white w-full !p-0 !pl-1 border-0 whitespace-pre-wrap break-words font-mono text-sm">
                          {children}
                        </pre>
                      </span>
                    </span>
                  </span>
                </span>
              </span>
            </span>
          );
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
