"use client";

import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { HTMLAttributes, useEffect, useState } from "react";
import { motion } from "framer-motion";

interface ScriptCopyBtnProps extends HTMLAttributes<HTMLDivElement> {
  showMultiplePackageOptions?: boolean;
  codeLanguage: string;
  lightTheme: string;
  darkTheme: string;
  commandMap: Record<string, string>;
  className?: string;
}

export function ScriptCopyBtn({
  showMultiplePackageOptions = true,
  codeLanguage,
  lightTheme,
  darkTheme,
  commandMap,
  className,
}: ScriptCopyBtnProps) {
  const packageManagers = Object.keys(commandMap);
  const [packageManager, setPackageManager] = useState(packageManagers[0]);
  const [copied, setCopied] = useState(false);
  const command = commandMap[packageManager];
  const [maxWidth, setMaxWidth] = useState<number>(0);

  // Calculate max width needed for all commands
  useEffect(() => {
    const tempElement = document.createElement("pre");
    tempElement.style.visibility = "hidden";
    tempElement.style.position = "absolute";
    tempElement.style.fontSize = "0.75rem"; // text-xs
    tempElement.style.fontFamily =
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    document.body.appendChild(tempElement);

    let maxCommandWidth = 0;
    Object.values(commandMap).forEach((cmd) => {
      tempElement.textContent = cmd;
      const width = tempElement.offsetWidth;
      maxCommandWidth = Math.max(maxCommandWidth, width);
    });

    document.body.removeChild(tempElement);
    setMaxWidth(maxCommandWidth + 64); // Adding padding for copy button and container padding
  }, [commandMap]);

  // Force light mode for now while keeping dark mode logic for later
  const forcedTheme = "light";

  useEffect(() => {
    async function loadHighlightedCode() {
      try {
        const { codeToHtml } = await import("shiki");
        await codeToHtml(command, {
          lang: codeLanguage,
          themes: {
            light: lightTheme,
            dark: darkTheme,
          },
          defaultColor: forcedTheme,
        });
      } catch (error) {
        console.error("Error highlighting code:", error);
      }
    }

    loadHighlightedCode();
  }, [command, forcedTheme, codeLanguage, lightTheme, darkTheme]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "mx-auto overflow-hidden rounded-[0px] border border-gray-200 bg-white mt-8",
        className,
      )}
    >
      <div className="w-full">
        <div className="border-b border-gray-200 bg-white">
          {showMultiplePackageOptions && (
            <div className="relative flex justify-start">
              <div className="flex w-full text-xs">
                {packageManagers.map((pm) => (
                  <button
                    key={pm}
                    className={`relative py-2 px-3 transition-colors hover:bg-yellow-50 ${
                      packageManager === pm
                        ? "text-gray-900 bg-yellow-50"
                        : "text-gray-400"
                    }`}
                    onClick={() => setPackageManager(pm)}
                  >
                    <span className="text-left text-xs">{pm}</span>
                    {packageManager === pm && (
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400"
                        layoutId="activeTab"
                        initial={false}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="relative flex items-center bg-white px-2">
          <div
            className="w-full font-mono"
            style={{ minWidth: `${maxWidth}px` }}
          >
            <pre className="font-mono text-left">
              <code className="text-xs text-gray-600">{command}</code>
            </pre>
          </div>
          <button
            className="relative ml-2 h-8 w-8 text-gray-400 hover:text-gray-600 flex items-center justify-center"
            onClick={copyToClipboard}
            aria-label={copied ? "Copied" : "Copy to clipboard"}
          >
            <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
            <Copy
              className={`h-4 w-4 transition-all duration-300 ${
                copied ? "scale-0" : "scale-100"
              }`}
            />
            <Check
              className={`absolute inset-0 m-auto h-4 w-4 transition-all duration-300 ${
                copied ? "scale-100" : "scale-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
