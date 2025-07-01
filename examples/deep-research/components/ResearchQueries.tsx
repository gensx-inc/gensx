import { ChevronDown, ChevronRight } from "lucide-react";

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
              Research Queries ({queries.length})
            </h3>
          </div>
        </button>
        {expanded && (
          <div className="px-4 pb-4 space-y-2">
            {queries.map((query, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-slate-50 rounded-md"
              >
                <span className="text-slate-500 text-sm font-medium min-w-6">
                  {index + 1}.
                </span>
                <span className="text-slate-800">{query}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
