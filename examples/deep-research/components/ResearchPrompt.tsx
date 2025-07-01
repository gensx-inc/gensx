export function ResearchPrompt({ prompt }: { prompt?: string }) {
  if (!prompt) return null;
  return (
    <div className="flex justify-start px-2 py-2">
      <div className="bg-white rounded-lg border-1 border-slate-800 shadow-lg max-w-4xl w-full p-6 mb-2">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
          <h3 className="font-medium text-slate-800">Research Topic</h3>
        </div>
        <p className="text-slate-900 text-lg font-semibold whitespace-pre-line leading-relaxed tracking-wide">
          {prompt}
        </p>
      </div>
    </div>
  );
}
