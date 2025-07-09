import { ChevronDown, ChevronRight } from "lucide-react";
import { ReactNode } from "react";

interface TimelineSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  isActive?: boolean;
  children: ReactNode;
  showTimeline?: boolean;
}

export function TimelineSection({
  title,
  expanded,
  onToggle,
  isActive,
  children,
  showTimeline = true,
}: TimelineSectionProps) {
  return (
    <div className="relative">
      {/* Timeline Line */}
      {showTimeline && (
        <div
          className={`absolute left-6 top-2.5 w-px bg-zinc-700 ${isActive === false ? " -bottom-6" : "bottom-0"}`}
        ></div>
      )}

      {/* Timeline Dot */}
      {showTimeline && (
        <div
          className={`absolute left-4.5 top-2.5 w-3 h-3 ${isActive ? "bg-slate-600" : "bg-zinc-600"} rounded-full border-2 border-zinc-900`}
        ></div>
      )}

      <div className={showTimeline ? "pl-12 pr-2" : "pr-2"}>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-3 py-1 border border-transparent hover:cursor-pointer transition-colors rounded-lg"
        >
          <h4
            className={`font-medium text-sm ${
              isActive
                ? "bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600 bg-clip-text text-transparent bg-[length:200%_100%] animate-[shimmer_4s_linear_infinite_reverse]"
                : "text-zinc-400"
            }`}
          >
            {title}
          </h4>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          )}
        </button>
        {expanded && <div className="px-3 py-1 mb-2">{children}</div>}
      </div>
    </div>
  );
}
