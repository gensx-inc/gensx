export function ResearchPrompt({ prompt }: { prompt?: string }) {
  if (!prompt) return null;
  return (
    <div className="px-2 py-4">
      <div className="px-3 py-4 border-b border-zinc-700">
        <p className="text-zinc-200 text-2xl font-bold leading-relaxed tracking-wide">
          {prompt}
        </p>
      </div>
    </div>
  );
}
