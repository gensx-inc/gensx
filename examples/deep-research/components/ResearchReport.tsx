import { MarkdownContent } from "./MarkdownContent";

interface ResearchReportProps {
  report: string;
  isActive?: boolean;
}

export function ResearchReport({ report, isActive }: ResearchReportProps) {
  if (!report && !isActive) return null;

  return (
    <div className="relative">
      {/* Timeline Line (ends here) */}
      <div className="absolute left-6 top-0 h-6 w-px bg-zinc-700"></div>

      {/* Timeline Dot */}
      <div
        className={`absolute left-4.5 top-3 w-3 h-3 ${isActive ? "bg-slate-600" : "bg-zinc-600"} rounded-full border-2 border-zinc-900`}
      ></div>

      <div className="pl-12 pr-2 py-2">
        <div className="px-3">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-700">
            <h4
              className={`font-medium text-sm ${isActive ? "bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600 bg-clip-text text-transparent bg-[length:200%_100%] animate-[shimmer_4s_linear_infinite_reverse]" : "text-zinc-400"}`}
            >
              Writing research report
            </h4>
          </div>
          <div className="text-zinc-300">
            <MarkdownContent content={report} />
          </div>
        </div>
      </div>
    </div>
  );
}
