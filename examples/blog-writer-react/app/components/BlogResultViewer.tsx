"use client";

interface BlogOutput {
  title: string;
  content: string;
  metadata: {
    researchTopics: string[];
    sectionsCount: number;
    hasWebResearch: boolean;
    hasToneMatching: boolean;
    wordCount: number;
  };
}

interface BlogResultViewerProps {
  result: BlogOutput;
}

export function BlogResultViewer({ result }: BlogResultViewerProps) {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(result.content);
      alert("Blog content copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Failed to copy to clipboard");
    }
  };

  const downloadAsMarkdown = () => {
    const markdownContent = `# ${result.title}\n\n${result.content}`;
    const blob = new Blob([markdownContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Metadata Summary */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-3">
          ✅ Blog Post Generated Successfully!
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {result.metadata.wordCount}
            </div>
            <div className="text-green-600 dark:text-green-400">Words</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {result.metadata.sectionsCount}
            </div>
            <div className="text-green-600 dark:text-green-400">Sections</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {result.metadata.researchTopics.length}
            </div>
            <div className="text-green-600 dark:text-green-400">Topics</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {result.metadata.hasWebResearch ? "✓" : "✗"}
            </div>
            <div className="text-green-600 dark:text-green-400">Research</div>
          </div>
        </div>

        {/* Features Used */}
        <div className="mt-4 flex flex-wrap gap-2">
          {result.metadata.hasWebResearch && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              🔍 Web Research
            </span>
          )}
          {result.metadata.hasToneMatching && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              🎨 Tone Matching
            </span>
          )}
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            ✍️ AI-Generated
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={copyToClipboard}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
        >
          <span>📋</span>
          <span>Copy to Clipboard</span>
        </button>

        <button
          onClick={downloadAsMarkdown}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors duration-200"
        >
          <span>⬇️</span>
          <span>Download Markdown</span>
        </button>
      </div>

      {/* Research Topics Used */}
      {result.metadata.researchTopics.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
            🔍 Research Topics Covered
          </h4>
          <div className="flex flex-wrap gap-2">
            {result.metadata.researchTopics.map((topic, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Blog Content */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white flex items-center space-x-2">
            <span>📄</span>
            <span>Generated Blog Post</span>
          </h3>
        </div>

        <div className="p-6">
          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            {result.title}
          </h1>

          {/* Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {result.content.split("\n\n").map((paragraph, index) => {
              // Handle headings
              if (paragraph.startsWith("# ")) {
                return (
                  <h1
                    key={index}
                    className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-white"
                  >
                    {paragraph.substring(2)}
                  </h1>
                );
              }
              if (paragraph.startsWith("## ")) {
                return (
                  <h2
                    key={index}
                    className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white"
                  >
                    {paragraph.substring(3)}
                  </h2>
                );
              }
              if (paragraph.startsWith("### ")) {
                return (
                  <h3
                    key={index}
                    className="text-lg font-medium mt-4 mb-2 text-gray-900 dark:text-white"
                  >
                    {paragraph.substring(4)}
                  </h3>
                );
              }

              // Handle regular paragraphs
              if (paragraph.trim()) {
                return (
                  <p
                    key={index}
                    className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed"
                  >
                    {paragraph}
                  </p>
                );
              }

              return null;
            })}
          </div>
        </div>
      </div>

      {/* Technical Details */}
      <details className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <summary className="font-medium text-gray-900 dark:text-white cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
          🔧 Technical Details
        </summary>
        <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <strong>Generated with:</strong> GenSX Hierarchical State
            Composition
          </div>
          <div>
            <strong>Workflow components:</strong> Research → Outline → Draft →
            Editorial
            {result.metadata.hasToneMatching && " → Tone Matching"}
          </div>
          <div>
            <strong>State streaming:</strong> Real-time updates via Server-Sent
            Events
          </div>
          <div>
            <strong>Type safety:</strong> Shared TypeScript types between
            frontend and workflow
          </div>
        </div>

        <pre className="mt-3 text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto text-gray-700 dark:text-gray-300">
          {JSON.stringify(result.metadata, null, 2)}
        </pre>
      </details>
    </div>
  );
}
