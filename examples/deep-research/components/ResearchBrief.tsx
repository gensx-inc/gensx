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
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-6 top-8 bottom-0 w-px bg-zinc-700"></div>

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
          <h3 className="font-medium text-zinc-200">Planning</h3>
        </button>
        {expanded && (
          <div className="px-3 py-2 mt-2">
            <div className="text-zinc-300">
              <MarkdownContent
                content={researchBrief}
                className="text-sm [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h4]:text-base [&_h5]:text-sm [&_h6]:text-xs [&_p]:text-sm [&_li]:text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
