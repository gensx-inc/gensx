"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import WorkflowInput from "@/components/WorkflowInput";
import WorkflowOutput from "@/components/WorkflowOutput";

export default function Page() {
  const [jsonInput, setJsonInput] = useState("");
  const [result, setResult] = useState<{
    isValid: boolean;
    data?: unknown;
    error?: string;
    formatted?: string;
  } | null>(null);

  const handleSubmit = () => {
    if (!jsonInput.trim()) {
      setResult({
        isValid: false,
        error: "Please enter some JSON to validate",
      });
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      const formatted = JSON.stringify(parsed, null, 2);
      setResult({
        isValid: true,
        data: parsed,
        formatted: formatted,
      });
    } catch (error) {
      setResult({
        isValid: false,
        error: error instanceof Error ? error.message : "Invalid JSON format",
      });
    }
  };

  const handleClear = () => {
    setJsonInput("");
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with links */}
      <div className="border-b border-border px-2 py-2 h-12 flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          {/* Left side - empty for now */}
        </div>
        {/* Right-aligned links */}
        <div className="flex items-center gap-2 ml-auto mr-4">
          <Link
            href="https://github.com/gensx-inc/gensx"
            passHref
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/github-mark.svg"
              alt="GitHub"
              className="w-6 h-6 dark:invert"
              width={24}
              height={24}
            />
          </Link>
          <div className="h-6 border-l border-border mx-2" />
          <Link
            href="https://gensx.com/docs"
            passHref
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image src="/logo.svg" alt="Docs" width={87} height={35} />
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-foreground my-4">
              GenSX Next.js Template
            </h1>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <WorkflowInput
              jsonInput={jsonInput}
              onInputChange={setJsonInput}
              onSubmit={handleSubmit}
              onClear={handleClear}
            />
            <WorkflowOutput result={result} />
          </div>
        </div>
      </div>
    </div>
  );
}
