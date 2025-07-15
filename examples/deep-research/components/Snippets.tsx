import { useState, useEffect } from "react";

interface SearchResult {
  title: string;
  url: string;
  description: string;
  content?: string;
  snippet?: string;
}

interface ResearchSnippetsProps {
  searchResults: SearchResult[];
}

// Helper function to extract domain from URL
function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function Snippets({ searchResults }: ResearchSnippetsProps) {
  // Filter results that have snippets
  const resultsWithSnippets = searchResults.filter(
    (result) => result.snippet && result.snippet.trim() !== "",
  );

  const [currentIndex, setCurrentIndex] = useState(() =>
    resultsWithSnippets.length > 0
      ? Math.floor(Math.random() * resultsWithSnippets.length)
      : 0,
  );

  // Auto-rotate through snippets randomly
  useEffect(() => {
    if (resultsWithSnippets.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * resultsWithSnippets.length);
        } while (newIndex === prev && resultsWithSnippets.length > 1);
        return newIndex;
      });
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [resultsWithSnippets.length]);

  // Don't render if no snippets
  if (resultsWithSnippets.length === 0) return null;

  const currentResult = resultsWithSnippets[currentIndex];

  return (
    <div className="pt-2">
      <div className=" rounded-lg">
        <div>
          <div className="text-xs leading-relaxed italic border-zinc-600 bg-gradient-to-r from-zinc-500 via-zinc-300 to-zinc-500 bg-clip-text text-transparent bg-[length:200%_100%] animate-[shimmer_8s_linear_infinite_reverse]">
            &quot;{currentResult.snippet}&quot; &nbsp; -{" "}
            {getDomain(currentResult.url)}
          </div>
        </div>
      </div>
    </div>
  );
}
