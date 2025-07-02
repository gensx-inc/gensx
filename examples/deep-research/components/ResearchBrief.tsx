import { ChevronDown, ChevronRight } from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";

interface ResearchBriefProps {
  researchBrief: string;
  expanded: boolean;
  onToggle: () => void;
  isActive?: boolean;
}

export function ResearchBrief({
  researchBrief,
  expanded,
  onToggle,
  isActive,
}: ResearchBriefProps) {
  if (!researchBrief) return null;

  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-6 top-3 bottom-0 w-px bg-zinc-700"></div>

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
            Planning
          </h4>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          )}
        </button>
        {expanded && (
          <div className="px-3 mb-2">
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
