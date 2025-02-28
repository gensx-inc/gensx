"use client";

import React from "react";
import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/vs.css"; // Using Visual Studio light theme for good contrast

interface CodeComponentProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// Custom component to render the styled image using CSS instead of nested divs
const StyledImage = (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
  <span className="block relative my-2 w-full before:content-[''] before:absolute before:left-0 before:top-0 before:w-[30px] before:h-[1px] before:bg-gray-800 before:z-10 after:content-[''] after:absolute after:left-0 after:top-0 after:w-[1px] after:h-[30px] after:bg-gray-800 after:z-10">
    <span className="block relative before:content-[''] before:absolute before:right-0 before:top-0 before:w-[30px] before:h-[1px] before:bg-gray-800 before:z-10 after:content-[''] after:absolute after:right-0 after:top-0 after:w-[1px] after:h-[30px] after:bg-gray-800 after:z-10">
      <span className="block relative before:content-[''] before:absolute before:left-0 before:bottom-0 before:w-[30px] before:h-[1px] before:bg-gray-800 before:z-10 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-[1px] after:h-[30px] after:bg-gray-800 after:z-10">
        <span className="block relative before:content-[''] before:absolute before:right-0 before:bottom-0 before:w-[30px] before:h-[1px] before:bg-gray-800 before:z-10 after:content-[''] after:absolute after:right-0 after:bottom-0 after:w-[1px] after:h-[30px] after:bg-gray-800 after:z-10">
          <span className="block relative border-t border-b border-gray-200">
            <span className="block relative border-l border-r border-gray-200 my-[0px]">
              <img {...props} className="border-0 p-0 w-full" />
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
    <div className="[&_pre]:overflow-x-auto [&_pre]:bg-white [&_pre]:rounded-[0px] [&_pre]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        className={className}
        components={{
          // Override paragraph rendering
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

          // This will only be used for images not directly in paragraphs
          img(props) {
            return <StyledImage {...props} />;
          },

          code(props: CodeComponentProps) {
            const { inline, children, className, ...rest } = props;
            const language = className?.replace("hljs language-", "");

            if (inline) {
              return (
                <code className="text-sm" {...rest}>
                  {children}
                </code>
              );
            }

            return (
              <span className="block relative mt-2 mb-1 w-full before:content-[''] before:absolute before:left-0 before:top-0 before:w-[30px] before:h-[1px] before:bg-gray-800 before:z-10 after:content-[''] after:absolute after:left-0 after:top-0 after:w-[1px] after:h-[30px] after:bg-gray-800 after:z-10">
                <span className="block relative before:content-[''] before:absolute before:right-0 before:top-0 before:w-[30px] before:h-[1px] before:bg-gray-800 before:z-10 after:content-[''] after:absolute after:right-0 after:top-0 after:w-[1px] after:h-[30px] after:bg-gray-800 after:z-10">
                  <span className="block relative before:content-[''] before:absolute before:left-0 before:bottom-0 before:w-[30px] before:h-[1px] before:bg-gray-800 before:z-10 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-[1px] after:h-[30px] after:bg-gray-800 after:z-10">
                    <span className="block relative before:content-[''] before:absolute before:right-0 before:bottom-0 before:w-[30px] before:h-[1px] before:bg-gray-800 before:z-10 after:content-[''] after:absolute after:right-0 after:bottom-0 after:w-[1px] after:h-[30px] after:bg-gray-800 after:z-10">
                      <span className="block relative border-t border-b border-gray-200">
                        <span className="block relative border-l border-r border-gray-200 my-[5px]">
                          {language && (
                            <span className="absolute right-2 top-2 text-xs font-mono text-gray-800 z-10">
                              {language}
                            </span>
                          )}
                          <pre className="bg-white w-full p-0 border-0">
                            <code
                              {...rest}
                              className={`${className} text-xs md:text-sm leading-relaxed p-0 block`}
                            >
                              {children}
                            </code>
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
    </div>
  );
}
