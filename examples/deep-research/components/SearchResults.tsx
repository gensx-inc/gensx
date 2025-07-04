import { Globe } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TimelineSection } from "./TimelineSection";
import { ResearchSnippets } from "./ResearchSnippets";

interface SearchResult {
  title: string;
  url: string;
  description: string;
  content?: string;
  snippet?: string;
}

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
    <TimelineSection
      title={`Reading ${results.length} sources`}
      expanded={expanded}
      onToggle={onToggle}
      isActive={isActive}
    >
      {/* Source Links Section */}
      <div className="flex flex-wrap gap-2">
        {results.map((result, index) => (
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
      {/* Research Snippets Section */}
      {!isActive && <ResearchSnippets searchResults={results} />}
    </TimelineSection>
  );
}
