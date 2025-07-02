import { ChevronDown, ChevronRight } from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";

interface ResearchBriefProps {
  researchBrief: string;
  expanded: boolean;
  onToggle: () => void;
}

export function ResearchBrief({
  researchBrief,
  expanded,
  onToggle,
}: ResearchBriefProps) {
  if (!researchBrief) return null;

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
        <h3 className="font-medium text-zinc-200">Research Brief</h3>
      </button>
      {expanded && (
        <div className="px-3 py-2 mt-2">
          <div className="text-zinc-300">
            <MarkdownContent content={researchBrief} />
          </div>
        </div>
      )}
    </div>
  );
}
