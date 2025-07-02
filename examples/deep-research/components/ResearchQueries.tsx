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
        <h3 className="font-medium text-zinc-200">Searching</h3>
      </button>
      {expanded && (
        <div className="px-3 py-2 mt-2 flex flex-wrap gap-2 ">
          {queries.map((query, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-full text-sm"
            >
              <Search className="w-4 h-4 text-zinc-400" />
              <span className="text-zinc-200">{query}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
