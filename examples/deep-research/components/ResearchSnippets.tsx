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

export function ResearchSnippets({ searchResults }: ResearchSnippetsProps) {
  // Filter results that have snippets
  const resultsWithSnippets = searchResults.filter(
    (result) => result.snippet && result.snippet.trim() !== "",
  );

  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-rotate through snippets
  useEffect(() => {
    if (resultsWithSnippets.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % resultsWithSnippets.length);
    }, 6000); // Change every 6 seconds

    return () => clearInterval(interval);
  }, [resultsWithSnippets.length]);

  // Don't render if no snippets
  if (resultsWithSnippets.length === 0) return null;

  const currentResult = resultsWithSnippets[currentIndex];

  // const goToPrevious = () => {
  //   setCurrentIndex((prev) =>
  //     prev === 0 ? resultsWithSnippets.length - 1 : prev - 1,
  //   );
  // };

  // const goToNext = () => {
  //   setCurrentIndex((prev) => (prev + 1) % resultsWithSnippets.length);
  // };

  // const toggleAutoPlay = () => {
  //   setIsPlaying(!isPlaying);
  // };

  return (
    <div className="pt-2">
      <div className=" rounded-lg">
        <div className="flex items-center justify-between mb-3">
          {/* <div className="flex items-center gap-2">
            <h3 className="text-zinc-300 font-medium text-sm">Key Insights</h3>
            <span className="text-zinc-500 text-xs">
              {currentIndex + 1} of {resultsWithSnippets.length}
            </span>
          </div> */}
          {/* <div className="flex items-center gap-2">
            <button
              onClick={toggleAutoPlay}
              className="text-zinc-500 hover:text-zinc-300 text-xs px-2 py-1 rounded hover:bg-zinc-700/50 transition-colors"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrevious}
                className="p-1 hover:bg-zinc-700/50 rounded transition-colors"
                disabled={resultsWithSnippets.length <= 1}
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
              </button>
              <button
                onClick={goToNext}
                className="p-1 hover:bg-zinc-700/50 rounded transition-colors"
                disabled={resultsWithSnippets.length <= 1}
              >
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div> */}
        </div>

        <div>
          <div className="text-xs leading-relaxed italic border-zinc-600 bg-gradient-to-r from-zinc-500 via-zinc-300 to-zinc-500 bg-clip-text text-transparent bg-[length:200%_100%] animate-[shimmer_8s_linear_infinite_reverse]">
            &quot;{currentResult.snippet}&quot; &nbsp; -{" "}
            {getDomain(currentResult.url)}
          </div>

          <div className="flex items-center justify-end">
            {/* <Link
              href={currentResult.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-200 text-xs transition-colors truncate max-w-[70%]"
            >
              {currentResult.title}
            </Link> */}
            {/* <div className="text-zinc-500 text-xs">
              {getDomain(currentResult.url)}
            </div> */}
          </div>
        </div>

        {/* Progress indicator */}
        {/* <div className="flex gap-1 mt-3">
          {resultsWithSnippets.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-1 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-zinc-400 w-6"
                  : "bg-zinc-700 w-2 hover:bg-zinc-600"
              }`}
            />
          ))}
        </div> */}
      </div>
    </div>
  );
}
