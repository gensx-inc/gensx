"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  isCentered?: boolean;
}

export function ChatInput({
  onSendMessage,
  disabled,
  isCentered,
}: ChatInputProps) {
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
    if (!disabled) {
      textareaRef.current?.focus();
    }
  }, [disabled]);

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

  if (isCentered) {
    return (
      <div className="w-full flex flex-col items-center -mt-36">
        {/* Caption */}
        <div className="text-center mb-4">
          <h1 className="text-4xl font-semibold text-zinc-100 mb-2">
            Deep Research
          </h1>
          <p className="text-zinc-400 text-lg">
            Experience how GenSX lets you build agents with streaming and human
            in the loop.
          </p>
        </div>

        {/* Centered Chat Input */}
        <form onSubmit={handleSubmit} className="relative w-full max-w-2xl">
          <div
            className={cn(
              "relative flex items-end gap-3 p-2 rounded-2xl border transition-all duration-200 bg-zinc-800 backdrop-blur-sm shadow-lg",
              isFocused
                ? "shadow-xl shadow-zinc-500/20"
                : "border-zinc-700 hover:border-zinc-600 hover:shadow-lg",
            )}
          >
            {/* Text Input */}
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="What would you like to research?"
              disabled={disabled}
              className="flex-1 min-h-[3rem] max-h-[12rem] resize-none border-0 bg-transparent p-2 text-zinc-200 focus-visible:ring-0 focus-visible:ring-offset-0 text-base leading-relaxed placeholder:text-zinc-400"
              rows={2}
            />

            {/* Send Button */}
            <Button
              type="submit"
              size="sm"
              disabled={!message.trim() || disabled}
              className={cn(
                "flex-shrink-0 h-10 w-10 p-0 rounded-lg transition-all duration-200 bg-gradient-to-br from-zinc-800 to-zinc-700",
                !message.trim() || disabled
                  ? "bg-zinc-800 hover:bg-zinc-700 cursor-not-allowed"
                  : "hover:shadow-md transform hover:scale-105 active:scale-95",
              )}
            >
              <Send
                size={18}
                className={cn(
                  "transition-colors duration-200",
                  !message.trim() || disabled ? "text-zinc-400" : "text-white",
                )}
              />
            </Button>
          </div>
        </form>
        <p className="text-zinc-400 text-xs mt-4 text-center">
          Demo powered by{" "}
          <a
            href="https://gensx.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-300 transition-colors"
          >
            GenSX
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div
        className={cn(
          "relative flex items-end gap-2 p-1 mb-2 rounded-2xl border transition-all duration-200 bg-zinc-800 backdrop-blur-sm",
          isFocused
            ? " shadow-lg shadow-zinc-500/20"
            : "border-zinc-700 shadow-lg hover:border-zinc-600 hover:shadow-xl",
        )}
      >
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
          className="flex-1 min-h-[1.5rem] max-h-[7.5rem] resize-none border-0 bg-transparent text-zinc-200 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm leading-relaxed placeholder:text-zinc-400"
          rows={1}
        />

        {/* Send Button */}
        <Button
          type="submit"
          size="sm"
          disabled={!message.trim() || disabled}
          className={cn(
            "flex-shrink-0 h-8 w-8 p-0 rounded-lg transition-all duration-200 bg-gradient-to-br from-zinc-800 to-zinc-700 mr-1 mb-1",
            !message.trim() || disabled
              ? "bg-zinc-800 hover:bg-zinc-700 cursor-not-allowed"
              : "hover:shadow-md transform hover:scale-105 active:scale-95",
          )}
        >
          <Send
            size={16}
            className={cn(
              "transition-colors duration-200",
              !message.trim() || disabled ? "text-zinc-400" : "text-white",
            )}
          />
        </Button>
      </div>
    </form>
  );
}
