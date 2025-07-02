import { ChevronDown, ChevronRight, ExternalLink, Globe } from "lucide-react";
import { JsonValue } from "@gensx/core";
import { useState } from "react";
import Image from "next/image";

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
      <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0">
        <Globe className="w-4 h-4 text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0">
      <Image
        src={faviconUrl}
        alt=""
        width={16}
        height={16}
        className="rounded-sm"
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
    <div className="px-2 py-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/50 transition-colors rounded-lg"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        )}
        <h3 className="font-medium text-zinc-200">
          Reading sources · {results.length}
        </h3>
      </button>
      {expanded && (
        <div className="px-3 py-2 mt-2 space-y-3">
          {results.slice(0, 10).map((result, index) => (
            <div key={index} className="flex items-start gap-3">
              <WebsiteIcon url={result.url} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-zinc-200 text-sm leading-tight">
                    {result.title}
                  </h4>
                  {result.url && (
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-zinc-200 flex-shrink-0 ml-2"
                      title="Open source"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {result.url && (
                  <p className="text-zinc-500 text-xs mt-1 truncate">
                    {getDomain(result.url)}
                  </p>
                )}
              </div>
            </div>
          ))}
          {results.length > 10 && (
            <p className="text-zinc-500 text-sm text-center py-2">
              ... and {results.length - 10} more sources
            </p>
          )}
        </div>
      )}
    </div>
  );
}
