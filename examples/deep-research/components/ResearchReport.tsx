import { MarkdownContent } from "./MarkdownContent";

interface ResearchReportProps {
  report: string;
  status?: string;
}

export function ResearchReport({ report, status }: ResearchReportProps) {
  if (!report) return null;

  return (
    <div className="px-2 py-2 border-4 rounded-lg border-zinc-800/50">
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
  );
}
