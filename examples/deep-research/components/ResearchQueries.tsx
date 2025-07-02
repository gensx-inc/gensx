import { ChevronDown, ChevronRight, Search } from "lucide-react";

interface ResearchQueriesProps {
  queries: string[];
  expanded: boolean;
  onToggle: () => void;
  isActive?: boolean;
}

export function ResearchQueries({
  queries,
  expanded,
  onToggle,
  isActive,
}: ResearchQueriesProps) {
  if (!queries || queries.length === 0) return null;

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
            Searching
          </h4>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          )}
        </button>
        {expanded && (
          <div className="px-3 flex flex-wrap gap-2 mb-2">
            {queries.map((query, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-full text-xs"
              >
                <Search className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-200">{query}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
