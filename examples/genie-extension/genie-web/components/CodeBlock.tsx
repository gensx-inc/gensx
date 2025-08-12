"use client";

import { Highlight, Language, themes } from "prism-react-renderer";

type CodeBlockProps = {
  code: string;
  language?: Language;
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
    <Highlight code={code.trim()} language={language} theme={themes.github}>
      {({
        className: inheritedClassName,
        style,
        tokens,
        getLineProps,
        getTokenProps,
      }) => (
        <pre
          className={[
            inheritedClassName,
            "rounded-lg overflow-auto p-4 text-sm leading-relaxed bg-[#f6f8fa]",
            font === "mono" ? "font-mono" : "font-sans",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            ...style,
            fontFamily:
              font === "mono"
                ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                : 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
          }}
        >
          {tokens.map((line: any, i: any) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token: any, key: any) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}

export default CodeBlock;
