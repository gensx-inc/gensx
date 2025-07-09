import { Globe, Loader2 } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TimelineSection } from "./TimelineSection";
import { Snippets } from "./Snippets";
import { SearchResult } from "../gensx/types";

interface SearchResultsProps {
  searchResults: SearchResult[];
  expanded: boolean;
  onToggle: () => void;
  isActive?: boolean;
}

// Helper function to extract domain from URL
function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

// Component for favicon with fallback
function WebsiteIcon({
  url,
  large = false,
}: {
  url?: string;
  large?: boolean;
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const size = large ? "w-6 h-6" : "w-5 h-5";
  const iconSize = large ? "w-5 h-5" : "w-4 h-4";
  const imageSize = large ? 28 : 18;

  if (!url || imageError) {
    return (
      <div
        className={`${size} bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0`}
      >
        <Globe className={`${iconSize} text-zinc-400`} />
      </div>
    );
  }

  return (
    <div
      className={`${size} rounded-full flex items-center justify-center flex-shrink-0`}
    >
      {!imageLoaded && (
        <div className={`${iconSize} bg-zinc-600 animate-pulse`} />
      )}
      <Image
        src={url}
        alt=""
        width={imageSize}
        height={imageSize}
        className={imageLoaded ? "opacity-100" : "opacity-0"}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        unoptimized={true}
        priority={true}
      />
    </div>
  );
}

// Component for detailed hover card
function SearchResultDetail({ result }: { result: SearchResult }) {
  return (
    <div className="absolute top-full left-0 mt-1 w-[30rem] bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 p-4">
      {/* Header with favicon and title */}
      <div className="flex items-start gap-3 mb-3">
        <div className="mt-1">
          <WebsiteIcon url={result.favicon} large={true} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-zinc-100 font-medium text-sm leading-tight mb-1 text-ellipsis overflow-hidden whitespace-nowrap">
            {result.title}
          </h3>
          <p className="text-zinc-400 text-xs overflow-hidden text-ellipsis whitespace-nowrap">
            {result.url}
          </p>
        </div>
      </div>

      {/* Content section - scrollable */}
      {result.content && (
        <div className="border-t border-zinc-700 pt-3">
          <h4 className="text-zinc-400 text-xs font-medium mb-2">Content:</h4>
          <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-zinc-800">
            <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap">
              {result.content}
            </p>
          </div>
        </div>
      )}

      {/* Show processing status if pending */}
      {result.status === "pending" && (
        <div className="border-t border-zinc-700 pt-3">
          <div className="flex items-center gap-2 text-zinc-400 text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Scraping and summarizing content...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function SearchResults({
  searchResults,
  expanded,
  onToggle,
  isActive,
}: SearchResultsProps) {
  if (
    !searchResults ||
    !Array.isArray(searchResults) ||
    searchResults.length === 0
  ) {
    return null;
  }

  const results = searchResults as unknown as SearchResult[];

  return (
    <TimelineSection
      title={`Reading ${results.length} sources`}
      expanded={expanded}
      onToggle={onToggle}
      isActive={isActive}
    >
      {/* Source Links Section */}
      <div className="flex flex-wrap gap-2">
        {results.map((result, index) => (
          <div key={index} className="relative group">
            {/* Hover area that includes both card and popup */}
            <div className="absolute inset-0 w-[15rem] h-[6rem] group-hover:block" />

            <Link
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2 p-2 bg-zinc-800/50 hover:bg-zinc-700/70 transition-colors cursor-pointer rounded-xl border border-zinc-700/50 hover:border-zinc-600/50 max-w-[240px] relative z-10"
              title={result.title}
            >
              <div className="mb-1">
                <WebsiteIcon url={result.favicon} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-zinc-200 text-xs font-medium truncate">
                  {result.title}
                </p>
                <p className="text-zinc-500 text-xs truncate leading-tight">
                  {getDomain(result.url)}
                </p>
              </div>
            </Link>

            {/* Hover detail card */}
            <div className="hidden group-hover:block relative z-20">
              <SearchResultDetail result={result} />
            </div>
          </div>
        ))}
      </div>
      {/* Research Snippets Section */}
      {isActive && <Snippets searchResults={results} />}
    </TimelineSection>
  );
}
