import { MarkdownContent } from "./MarkdownContent";

interface ResearchReportProps {
  report: string;
  status?: string;
}

export function ResearchReport({ report, status }: ResearchReportProps) {
  if (!report) return null;

  return (
    <div className="relative">
      {/* Timeline Line (ends here) */}
      <div className="absolute left-6 top-0 h-8 w-px bg-zinc-700"></div>

      {/* Timeline Dot */}
      <div className="absolute left-4.5 top-6 w-3 h-3 bg-zinc-600 rounded-full border-2 border-zinc-900"></div>

      <div className="pl-12 pr-2 py-2">
        <div className="px-3 py-4">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-700">
            <h3 className="font-medium text-zinc-200">Research Report</h3>
            {status === "Generating" && (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                Generating...
              </div>
            )}
          </div>
          <div className="text-zinc-300">
            <MarkdownContent content={report} />
          </div>
        </div>
      </div>
    </div>
  );
}
