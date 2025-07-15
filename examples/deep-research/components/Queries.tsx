import { Search } from "lucide-react";
import { TimelineSection } from "./TimelineSection";

interface QueriesProps {
  queries: string[];
  expanded: boolean;
  onToggle: () => void;
  isActive?: boolean;
}

export function Queries({
  queries,
  expanded,
  onToggle,
  isActive,
}: QueriesProps) {
  if (!queries || queries.length === 0) return null;

  return (
    <TimelineSection
      title="Searching"
      expanded={expanded}
      onToggle={onToggle}
      isActive={isActive}
    >
      <div className="flex flex-wrap gap-2">
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
    </TimelineSection>
  );
}
