"use client";

import { DiffDisplay } from "@/components/ui/diff-display";
import { calculateDiff } from "@/lib/diff-utils";
import { useMemo, useState } from "react";

export default function TestPage() {
  const [oldText] = useState("The quick brown fox jumps over the lazy dog");
  const [newText] = useState("The fast brown cat jumps over the lazy dog");
  const [showDiff, setShowDiff] = useState(true);

  const diffSegments = useMemo(() => {
    return calculateDiff(oldText, newText);
  }, [oldText, newText]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Diff Animation Test</h1>

      <div className="mb-4">
        <button
          onClick={() => {
            setShowDiff(!showDiff);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showDiff ? "Hide" : "Show"} Diff
        </button>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold mb-2">Old Text:</h2>
        <p className="p-2 bg-gray-100 rounded">{oldText}</p>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold mb-2">New Text:</h2>
        <p className="p-2 bg-gray-100 rounded">{newText}</p>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold mb-2">Diff Display:</h2>
        <div className="p-4 bg-white rounded shadow">
          {showDiff ? (
            <DiffDisplay segments={diffSegments} isStreaming={false} />
          ) : (
            <p>{newText}</p>
          )}
        </div>
      </div>
    </div>
  );
}
