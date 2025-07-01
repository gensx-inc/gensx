import { MarkdownContent } from "./MarkdownContent";

interface ResearchReportProps {
  report: string;
  status?: string;
}

export function ResearchReport({ report, status }: ResearchReportProps) {
  if (!report) return null;

  return (
    <div className="flex justify-start px-2 py-2">
      <div className="bg-white rounded-lg p-6 max-w-none shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
          <h3 className="font-medium text-slate-800">Research Report</h3>
          {status === "Generating" && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Generating...
            </div>
          )}
        </div>
        <MarkdownContent content={report} />
      </div>
    </div>
  );
}
