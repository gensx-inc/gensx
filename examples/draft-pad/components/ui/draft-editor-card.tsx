import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Copy, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DraftEditorCardProps {
  output: string | null;
  isStreaming: boolean;
  error: string | null;
  userMessage: string;
  onUserMessageChange: (value: string) => void;
  onSubmit: () => void;
  className?: string;
}

export function DraftEditorCard({
  output,
  isStreaming,
  error,
  userMessage,
  onUserMessageChange,
  onSubmit,
  className = "",
}: DraftEditorCardProps) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [wasStreaming, setWasStreaming] = useState(false);

  // Track when streaming stops and focus the input
  useEffect(() => {
    if (wasStreaming && !isStreaming) {
      // Streaming just finished, focus the input
      inputRef.current?.focus();
    }
    setWasStreaming(isStreaming);
  }, [isStreaming, wasStreaming]);

  // Auto-scroll to bottom when content is being generated
  useEffect(() => {
    if (isStreaming && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [output, isStreaming]);

  // Focus input on initial mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCopy = async () => {
    if (output) {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <Card className="p-0 flex-1 flex flex-col min-h-0" liquidGlass={true}>
        <div className="flex flex-col h-full overflow-hidden">
          {output && (
            <div className="flex justify-end p-4 pb-0 flex-shrink-0">
              <Button
                onClick={() => void handleCopy()}
                className="cursor-pointer backdrop-blur-md bg-white/20 hover:bg-white/30 text-[#333333] border border-white/30 hover:border-white/40 shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.5)] transition-all p-2 rounded-xl"
                size="icon"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto min-h-0 p-4 pt-2 pb-10 px-6 custom-scrollbar"
          >
            {output ? (
              <div className="whitespace-pre-wrap text-[#333333]">
                {output}
                {isStreaming && (
                  <span className="inline-block w-2 h-5 bg-blue-400 ml-1 animate-pulse rounded-full" />
                )}
              </div>
            ) : (
              <div className="text-[#333333]/60 flex items-center justify-center h-full">
                {isStreaming
                  ? "Generating..."
                  : "Create a draft. Update it. Repeat."}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="flex gap-2 mt-4 flex-shrink-0">
        {/* Input with Glass-like styling */}
        <div className="flex-1 relative rounded-2xl overflow-hidden shadow-[0_4px_4px_rgba(0,0,0,0.15),0_0_15px_rgba(0,0,0,0.08)] transition-all duration-400 ease-out backdrop-blur-[3px] bg-white/10">
          <div className="absolute inset-0 z-[1] overflow-hidden rounded-2xl shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.4),inset_-1px_-1px_1px_1px_rgba(255,255,255,0.4)]" />
          <Input
            ref={inputRef}
            value={userMessage}
            onChange={(e) => {
              onUserMessageChange(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSubmit();
              }
            }}
            placeholder="Type your message here..."
            disabled={isStreaming}
            className="relative z-[2] w-full bg-transparent border-0 text-[#333333] placeholder-black/50 focus:outline-none focus:ring-2 focus:ring-white/50 px-4 py-3"
          />
        </div>

        {/* Send Button with Glass-like styling */}
        <div className="relative rounded-2xl overflow-hidden shadow-[0_4px_4px_rgba(0,0,0,0.15),0_0_15px_rgba(0,0,0,0.08)] transition-all duration-400 ease-out hover:shadow-[0_5px_5px_rgba(0,0,0,0.2),0_0_18px_rgba(0,0,0,0.1)] backdrop-blur-[3px] bg-white/10 hover:bg-white/15">
          <div className="absolute inset-0 z-[1] overflow-hidden rounded-2xl shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.4),inset_-1px_-1px_1px_1px_rgba(255,255,255,0.4)]" />
          <Button
            onClick={() => {
              onSubmit();
            }}
            disabled={!userMessage.trim() || isStreaming}
            className="relative z-[2] bg-transparent hover:bg-transparent border-0 text-[#333333] p-3 disabled:opacity-50 cursor-pointer"
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && <div className="text-red-400 text-sm">Error: {error}</div>}
    </div>
  );
}
