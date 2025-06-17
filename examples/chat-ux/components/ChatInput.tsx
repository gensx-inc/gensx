"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  useEffect(() => {
    // Auto-focus on mount
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div
        className={cn(
          "relative flex items-end gap-2 p-2 rounded-2xl border transition-all duration-200 bg-white/95 backdrop-blur-sm",
          isFocused
            ? "border-blue-300 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/30"
            : "border-slate-200 shadow-lg hover:border-slate-300 hover:shadow-xl",
        )}
      >
        {/* Attachment Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-shrink-0 h-8 w-8 p-0 rounded-lg hover:bg-slate-100 transition-colors duration-200"
          disabled={disabled}
        >
          <Paperclip size={16} className="text-slate-500" />
        </Button>

        {/* Text Input */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Type your message..."
          disabled={disabled}
          className="flex-1 min-h-[2.5rem] max-h-[7.5rem] resize-none border-0 bg-transparent p-2 text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm leading-relaxed placeholder:text-slate-400"
          rows={1}
        />

        {/* Send Button */}
        <Button
          type="submit"
          size="sm"
          disabled={!message.trim() || disabled}
          className={cn(
            "flex-shrink-0 h-8 w-8 p-0 rounded-lg transition-all duration-200",
            !message.trim() || disabled
              ? "bg-slate-100 hover:bg-slate-200 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95",
          )}
        >
          <Send
            size={16}
            className={cn(
              "transition-colors duration-200",
              !message.trim() || disabled ? "text-slate-400" : "text-white",
            )}
          />
        </Button>
      </div>

      {/* Helper Text */}
      <div className="flex justify-between items-center mt-2 px-2">
        <p className="text-xs text-slate-400">
          Press{" "}
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs">
            Enter
          </kbd>{" "}
          to send,{" "}
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs">
            Shift+Enter
          </kbd>{" "}
          for new line
        </p>
        <p
          className={cn(
            "text-xs transition-colors duration-200",
            message.length > 1000 ? "text-orange-500" : "text-slate-400",
          )}
        >
          {message.length}/2000
        </p>
      </div>
    </form>
  );
}
