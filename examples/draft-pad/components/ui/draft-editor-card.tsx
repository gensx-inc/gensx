import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DraftEditorCardProps {
  output?: string | null;
  isStreaming: boolean;
  error: string | null;
  userMessage: string;
  onUserMessageChange: (value: string) => void;
  onSubmit: () => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function DraftEditorCard({
  isStreaming,
  error,
  userMessage,
  onUserMessageChange,
  onSubmit,
  className = "",
  disabled = false,
  placeholder = "Type your message here...",
}: DraftEditorCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [wasStreaming, setWasStreaming] = useState(false);

  // Track when streaming stops and focus the input
  useEffect(() => {
    if (wasStreaming && !isStreaming) {
      // Streaming just finished, focus the input
      inputRef.current?.focus();
    }
    setWasStreaming(isStreaming);
  }, [isStreaming, wasStreaming]);

  // Focus input on initial mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex gap-2">
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
            placeholder={placeholder}
            disabled={isStreaming || disabled}
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
            disabled={!userMessage.trim() || isStreaming || disabled}
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
