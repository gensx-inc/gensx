"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { VoiceButton } from "./VoiceButton";
import { useVoiceRecording } from "../hooks/useVoiceRecording";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  isCentered?: boolean;
  isKeyboardOpen?: boolean;
  autoFocus?: boolean;
}

export function ChatInput({
  onSendMessage,
  disabled,
  isCentered,
  isKeyboardOpen,
  autoFocus = true,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice recording hook
  const voice = useVoiceRecording();

  // Handle form submission
  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }
      if (message.trim() && !disabled) {
        onSendMessage(message);
        setMessage("");
      }
    },
    [message, disabled, onSendMessage],
  );

  // Handle voice transcription completion
  useEffect(() => {
    if (voice.transcription?.trim()) {
      const transcribedText = voice.transcription.trim();
      setMessage(transcribedText);
      voice.clearTranscription();

      // Auto-submit after a short delay to ensure message is set
      if (!disabled) {
        setTimeout(() => {
          onSendMessage(transcribedText);
          setMessage("");
        }, 100);
      }
    }
  }, [voice.transcription, disabled, onSendMessage]);

  // Voice button handlers
  const handleStartRecording = useCallback(() => {
    voice.startRecording().catch((error: unknown) => {
      console.error("Failed to start recording:", error);
    });
  }, [voice.startRecording]);

  const handleStopRecording = useCallback(() => {
    voice.stopRecording().catch((error: unknown) => {
      console.error("Failed to stop recording:", error);
    });
  }, [voice.stopRecording]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  useEffect(() => {
    if (!disabled && autoFocus) {
      textareaRef.current?.focus();
    }
  }, [disabled, autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (isCentered) {
    return (
      <div
        className={`w-full flex flex-col items-center ${isKeyboardOpen ? "mt-0 pt-4" : "mt-8 pt-safe"}`}
      >
        {/* Caption */}
        <div className={`text-center ${isKeyboardOpen ? "mb-4" : "mb-8"}`}>
          <h1
            className={`font-extrabold text-slate-900 mb-2 px-4 font-gugi ${isKeyboardOpen ? "text-3xl sm:text-4xl md:text-5xl" : "text-4xl sm:text-5xl md:text-6xl lg:text-7xl"}`}
          >
            Explore the World with ZapMap
          </h1>
          {!isKeyboardOpen && (
            <>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 mt-4 mb-2">
                Your AI-Powered Map Chat Demo
              </h2>
              <p className="text-slate-600 text-base sm:text-lg mt-2 max-w-md sm:max-w-2xl mx-auto">
                See the power of ZapMap in action—chat with the map, get instant
                answers, and discover new places.
              </p>
              <p className="text-slate-500 text-sm sm:text-base mt-2 max-w-md sm:max-w-2xl mx-auto">
                Ask about locations, directions, or landmarks. ZapMap moves the
                map, places markers, and helps you explore—all in real time.
              </p>
            </>
          )}
        </div>

        {/* Centered Chat Input */}
        <form
          onSubmit={handleSubmit}
          className="relative w-full max-w-md sm:max-w-2xl"
        >
          <div
            className={cn(
              "relative flex items-end gap-3 p-2 rounded-2xl border transition-all duration-200 bg-white/95 backdrop-blur-sm shadow-lg",
              isFocused
                ? "shadow-xl shadow-slate-500/20"
                : "border-slate-200 hover:border-slate-300 hover:shadow-xl",
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
              placeholder="Type your message or use voice..."
              disabled={disabled}
              className="flex-1 min-h-[3rem] max-h-[12rem] resize-none border-0 bg-transparent p-2 text-gray-700 focus-visible:ring-0 focus-visible:ring-offset-0 text-base leading-relaxed placeholder:text-slate-400"
              rows={2}
            />

            {/* Send Button */}
            <Button
              type="submit"
              size="sm"
              disabled={!message.trim() || disabled}
              className={cn(
                "flex-shrink-0 h-10 w-10 p-0 rounded-lg transition-all duration-200 bg-gradient-to-br from-slate-800 to-slate-700",
                !message.trim() || disabled
                  ? "bg-slate-100 hover:bg-slate-200 cursor-not-allowed"
                  : "hover:shadow-md transform hover:scale-105 active:scale-95",
              )}
            >
              <Send
                size={18}
                className={cn(
                  "transition-colors duration-200",
                  !message.trim() || disabled ? "text-slate-400" : "text-white",
                )}
              />
            </Button>

            {/* Voice Button */}
            <VoiceButton
              isRecording={voice.isRecording}
              isTranscribing={voice.isTranscribing}
              audioLevels={voice.audioLevels}
              disabled={disabled}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
          </div>
        </form>
        <p className="text-slate-400 text-xs mt-4 text-center">
          Demo powered by{" "}
          <a
            href="https://gensx.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-600 transition-colors"
          >
            GenSX
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="flex items-center gap-2">
        {/* Text Input */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Ask me anything about locations..."
          disabled={disabled}
          className="flex-1 min-h-[2.5rem] max-h-[4rem] resize-none border-0 bg-transparent text-slate-900 placeholder-slate-700/70 focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none outline-none ring-0 shadow-none transition-all duration-200 rounded-lg px-3 py-2 text-sm leading-relaxed font-medium"
          style={{
            outline: "none",
            border: "none",
            boxShadow: "none",
            WebkitAppearance: "none",
            MozAppearance: "none",
          }}
          rows={1}
        />

        {/* Send Button */}
        <Button
          type="submit"
          size="sm"
          disabled={!message.trim() || disabled}
          className={cn(
            "flex-shrink-0 h-8 w-8 p-0 rounded-lg transition-all duration-200 bg-gradient-to-br from-blue-500 to-blue-600 border-0",
            !message.trim() || disabled
              ? "bg-slate-300 hover:bg-slate-300 cursor-not-allowed opacity-50"
              : "hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 active:scale-95",
          )}
        >
          <Send
            size={14}
            className={cn(
              "transition-colors duration-200",
              !message.trim() || disabled ? "text-slate-500" : "text-white",
            )}
          />
        </Button>

        {/* Voice Button */}
        <VoiceButton
          isRecording={voice.isRecording}
          isTranscribing={voice.isTranscribing}
          audioLevels={voice.audioLevels}
          disabled={disabled}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
        />
      </div>
    </form>
  );
}
