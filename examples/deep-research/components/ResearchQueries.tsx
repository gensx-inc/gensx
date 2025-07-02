import { ChevronDown, ChevronRight, Search } from "lucide-react";

interface ResearchQueriesProps {
  queries: string[];
  expanded: boolean;
  onToggle: () => void;
}

export function ResearchQueries({
  queries,
  expanded,
  onToggle,
}: ResearchQueriesProps) {
  if (!queries || queries.length === 0) return null;

  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-6 top-0 bottom-0 w-px bg-zinc-700"></div>

      {/* Timeline Dot */}
      <div className="absolute left-4.5 top-6 w-3 h-3 bg-zinc-600 rounded-full border-2 border-zinc-900"></div>

      <div className="pl-12 pr-2 py-2">
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/50 transition-colors rounded-lg"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          )}
          <h3 className="font-medium text-zinc-200">Searching</h3>
        </button>
        {expanded && (
          <div className="px-3 py-2 mt-2 flex flex-wrap gap-2 ">
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
