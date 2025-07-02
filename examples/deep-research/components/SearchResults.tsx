import { ChevronDown, ChevronRight, Globe } from "lucide-react";
import { JsonValue } from "@gensx/core";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface SearchResult {
  title: string;
  url: string;
  description: string;
  content?: string;
}

interface SearchResultsProps {
  searchResults: JsonValue;
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

// Helper function to get favicon URL
function getFaviconUrl(url: string): string {
  const domain = getDomain(url);
  if (!domain) return "";
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
}

// Component for favicon with fallback
function WebsiteIcon({ url }: { url: string }) {
  const [imageError, setImageError] = useState(false);
  const faviconUrl = getFaviconUrl(url);

  if (!faviconUrl || imageError) {
    return (
      <div className="w-5 h-5 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0">
        <Globe className="w-4 h-4 text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="w-5 h-5 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0">
      <Image
        src={faviconUrl}
        alt=""
        width={12}
        height={12}
        className=""
        onError={() => setImageError(true)}
        unoptimized={true}
      />
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
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-6 top-0 bottom-0 w-px bg-zinc-700"></div>

      {/* Timeline Dot */}
      <div className="absolute left-4.5 top-3 w-3 h-3 bg-zinc-600 rounded-full border-2 border-zinc-900"></div>

      <div className="pl-12 pr-2">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/50 transition-colors rounded-lg"
        >
          <h4
            className={`font-medium text-sm ${isActive ? "bg-gradient-to-r from-zinc-400 via-zinc-600 to-zinc-400 bg-clip-text text-transparent bg-[length:200%_100%] animate-[shimmer_4s_linear_infinite]" : "text-zinc-400"}`}
          >
            Reading {results.length} sources
          </h4>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          )}
        </button>
        {expanded && (
          <div className="px-3 mb-2">
            <div className="flex flex-wrap gap-2">
              {results.slice(0, 10).map((result, index) => (
                <Link
                  key={index}
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-2 bg-zinc-800/50 hover:bg-zinc-700/70 transition-colors cursor-pointer rounded-xl border border-zinc-700/50 hover:border-zinc-600/50 max-w-[240px]"
                  title={result.title}
                >
                  <WebsiteIcon url={result.url} />
                  <div className="min-w-0 flex-1">
                    <p className="text-zinc-200 text-xs font-medium truncate">
                      {result.title}
                    </p>
                    <p className="text-zinc-500 text-xs truncate leading-tight">
                      {getDomain(result.url)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            {results.length > 10 && (
              <p className="text-zinc-500 text-sm text-center py-2 mt-2">
                ... and {results.length - 10} more sources
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
