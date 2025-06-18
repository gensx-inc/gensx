import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ModelStreamState } from "@/gensx/workflows";
import { useEffect, useRef } from "react";

interface ModelStreamCardProps {
  modelStream: ModelStreamState;
  isSelected?: boolean;
  onSelect?: () => void;
  scrollPosition: number;
  onScrollUpdate: (scrollTop: number) => void;
}

export function ModelStreamCard({
  modelStream,
  isSelected = false,
  onSelect,
  scrollPosition,
  onScrollUpdate,
}: ModelStreamCardProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastContentLengthRef = useRef(0);
  const userHasScrolledRef = useRef(false);

  // Apply scroll position whenever it changes (from other cards)
  useEffect(() => {
    if (scrollContainerRef.current && !userHasScrolledRef.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollPosition;
        }
      });
    }
  }, [scrollPosition]);

  // Auto-scroll to bottom when new content is generated
  useEffect(() => {
    if (scrollContainerRef.current && modelStream.content) {
      const currentLength = modelStream.content.length;
      const isNewContent = currentLength > lastContentLengthRef.current;
      const isGenerating = modelStream.status === "generating";

      if (isNewContent && isGenerating && !userHasScrolledRef.current) {
        // Scroll to bottom for new content
        scrollContainerRef.current.scrollTop =
          scrollContainerRef.current.scrollHeight;
        // Update the shared scroll position
        onScrollUpdate(scrollContainerRef.current.scrollTop);
      }

      lastContentLengthRef.current = currentLength;
    }
  }, [modelStream.content, modelStream.status, onScrollUpdate]);

  // Reset user scroll flag when generation completes
  useEffect(() => {
    if (modelStream.status !== "generating") {
      userHasScrolledRef.current = false;
    }
  }, [modelStream.status]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom =
      Math.abs(target.scrollHeight - target.clientHeight - target.scrollTop) <
      5;

    // If user scrolls up while generating, stop auto-scroll
    if (modelStream.status === "generating" && !isAtBottom) {
      userHasScrolledRef.current = true;
    }

    onScrollUpdate(target.scrollTop);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "generating":
        return "text-blue-600";
      case "complete":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="h-full max-h-[80vh] flex flex-col gap-2">
      {/* Content Card */}
      <Card className="flex-1 min-h-0">
        <CardContent className="h-full p-0">
          <div className="h-full">
            <div
              ref={scrollContainerRef}
              className="h-full p-3 overflow-y-auto"
              onScroll={handleScroll}
            >
              {modelStream.content ? (
                <div className="text-sm whitespace-pre-wrap text-[#333333] leading-relaxed">
                  {modelStream.content}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-[#333333]/60">
                  {modelStream.status === "generating"
                    ? "Generating content..."
                    : "No content yet"}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header Card */}
      <Card
        className={`shrink-0 cursor-pointer transition-all duration-200 ${
          isSelected
            ? "ring-2 ring-blue-500 border-blue-300"
            : "hover:border-gray-400"
        }`}
        onClick={onSelect}
      >
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-[#333333] flex items-center gap-2">
              {modelStream.displayName}
              {isSelected && <span className="text-blue-600 text-xl">✓</span>}
            </CardTitle>
            <div className="flex gap-3 text-sm">
              <div className="text-center">
                <div className="font-bold text-blue-600">
                  {modelStream.wordCount}
                </div>
                <div className="text-xs text-[#333333]/70">Words</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-green-600">
                  {modelStream.charCount}
                </div>
                <div className="text-xs text-[#333333]/70">Chars</div>
              </div>
            </div>
          </div>
          <div
            className={`text-sm font-medium ${getStatusColor(modelStream.status)}`}
          >
            {modelStream.status.charAt(0).toUpperCase() +
              modelStream.status.slice(1)}
            {modelStream.error && `: ${modelStream.error}`}
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
