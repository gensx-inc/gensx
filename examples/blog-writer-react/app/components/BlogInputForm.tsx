"use client";

import { useState } from "react";

interface BlogInput {
  title: string;
  prompt: string;
  referenceURL?: string;
  wordCount?: number;
}

interface BlogInputFormProps {
  onSubmit: (input: BlogInput) => Promise<void>;
  isLoading: boolean;
  disabled: boolean;
}

export function BlogInputForm({
  onSubmit,
  isLoading,
  disabled,
}: BlogInputFormProps) {
  const [title, setTitle] = useState("The Future of AI in 2025");
  const [prompt, setPrompt] = useState(
    "Write a comprehensive analysis of emerging AI trends, focusing on breakthroughs in language models, computer vision, and robotics. Include real-world applications and potential societal impacts.",
  );
  const [referenceURL, setReferenceURL] = useState("");
  const [wordCount, setWordCount] = useState(1500);
  const [useWordCount, setUseWordCount] = useState(true);
  const [useReferenceURL, setUseReferenceURL] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !prompt.trim()) {
      alert("Please fill in both title and prompt");
      return;
    }

    const input: BlogInput = {
      title: title.trim(),
      prompt: prompt.trim(),
      ...(useWordCount && { wordCount }),
      ...(useReferenceURL &&
        referenceURL.trim() && { referenceURL: referenceURL.trim() }),
    };

    await onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title Input */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Blog Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
          placeholder="Enter your blog title..."
        />
      </div>

      {/* Prompt Input */}
      <div>
        <label
          htmlFor="prompt"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Writing Prompt
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={disabled}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed resize-none"
          placeholder="Describe what you want the blog post to cover..."
        />
      </div>

      {/* Word Count Option */}
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="use-word-count"
          checked={useWordCount}
          onChange={(e) => setUseWordCount(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
        />
        <label
          htmlFor="use-word-count"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Target Word Count
        </label>
        {useWordCount && (
          <input
            type="number"
            value={wordCount}
            onChange={(e) => setWordCount(Number(e.target.value))}
            disabled={disabled}
            min={500}
            max={5000}
            step={100}
            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
          />
        )}
      </div>

      {/* Reference URL Option */}
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <input
            type="checkbox"
            id="use-reference-url"
            checked={useReferenceURL}
            onChange={(e) => setUseReferenceURL(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
          />
          <label
            htmlFor="use-reference-url"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Reference URL (for tone matching)
          </label>
        </div>
        {useReferenceURL && (
          <input
            type="url"
            value={referenceURL}
            onChange={(e) => setReferenceURL(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
            placeholder="https://example.com/reference-article"
          />
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={disabled || !title.trim() || !prompt.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Starting Workflow...</span>
          </>
        ) : (
          <>
            <span>🚀</span>
            <span>Generate Blog Post</span>
          </>
        )}
      </button>

      {/* Help Text */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        <p>
          💡 <strong>Tip:</strong> This will demonstrate GenSX&apos;s
          hierarchical state composition with real-time updates for research,
          outline, draft, and editorial phases.
        </p>
      </div>
    </form>
  );
}
