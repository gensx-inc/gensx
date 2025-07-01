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
    return <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />;
  }

  return (
    <Image
      src={faviconUrl}
      alt=""
      width={16}
      height={16}
      className="flex-shrink-0"
      onError={() => setImageError(true)}
      unoptimized={true}
    />
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
    <div className="flex justify-start px-2 py-2">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm max-w-4xl w-full">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )}
            <h3 className="font-medium text-slate-800">
              Search Results ({results.length} sources)
            </h3>
          </div>
        </button>
        {expanded && (
          <div className="px-4 pb-4 space-y-3">
            {results.slice(0, 10).map((result, index) => (
              <div key={index} className="p-3 bg-slate-50 rounded-md">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <WebsiteIcon url={result.url} />
                    <h4 className="font-medium text-slate-800 text-sm leading-tight">
                      {result.title}
                    </h4>
                  </div>
                  {result.url && (
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                      title="Open source"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {result.description && (
                  <p className="text-slate-600 text-sm line-clamp-2 ml-6">
                    {result.description}
                  </p>
                )}
                {result.url && (
                  <p className="text-slate-500 text-xs mt-1 truncate ml-6">
                    {getDomain(result.url)}
                  </p>
                )}
              </div>
            ))}
            {results.length > 10 && (
              <p className="text-slate-500 text-sm text-center py-2">
                ... and {results.length - 10} more sources
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
