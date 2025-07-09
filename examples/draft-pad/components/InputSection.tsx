"use client";

import { type ModelConfig } from "@/gensx/workflows";
import { Send } from "lucide-react";
import { motion } from "motion/react";
import { RefObject, useEffect } from "react";

import { ModelDropdown } from "./ModelDropdown";

interface InputSectionProps {
  userMessage: string;
  selectedModelsForRun: ModelConfig[];
  sortedAvailableModels: ModelConfig[];
  isMultiSelectMode: boolean;
  showSelectionPrompt: boolean;
  workflowInProgress: boolean;
  sortedModelStreamsLength: number;
  isDropdownOpen: boolean;
  textareaRef: RefObject<HTMLTextAreaElement>;
  inputRef: RefObject<HTMLInputElement>;
  onUserMessageChange: (value: string) => void;
  onMultiSelectModeChange: (value: boolean) => void;
  onModelsChange: (models: ModelConfig[]) => void;
  onDropdownOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

export function InputSection({
  userMessage,
  selectedModelsForRun,
  sortedAvailableModels,
  isMultiSelectMode,
  showSelectionPrompt,
  workflowInProgress,
  sortedModelStreamsLength,
  isDropdownOpen,
  textareaRef,
  inputRef,
  onUserMessageChange,
  onMultiSelectModeChange,
  onModelsChange,
  onDropdownOpenChange,
  onSubmit,
}: InputSectionProps) {
  // Auto-resize textarea function
  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    const isInitialState =
      sortedModelStreamsLength === 0 && !workflowInProgress;
    const minHeight = 32;
    const maxHeight = isInitialState ? 300 : 200;

    const currentHeight = parseInt(textarea.style.height) || minHeight;
    const scrollTop = textarea.scrollTop;

    textarea.style.height = `${minHeight}px`;
    const contentHeight = textarea.scrollHeight;
    const newHeight = Math.max(minHeight, Math.min(contentHeight, maxHeight));

    if (newHeight !== currentHeight) {
      textarea.style.height = `${newHeight}px`;
    } else {
      textarea.style.height = `${currentHeight}px`;
    }

    textarea.scrollTop = scrollTop;
  };

  // Initialize textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = "32px";
      textarea.style.transition = "height 0.1s ease";
      textarea.style.boxSizing = "border-box";
    }
  }, []);

  const handleClose = () => {
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      } else if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const isInitialState = sortedModelStreamsLength === 0 && !workflowInProgress;

  return (
    <motion.div
      layout
      transition={{
        type: "spring",
        stiffness: 150,
        damping: 25,
        duration: 1.2,
      }}
      className={`flex-shrink-0 flex justify-center ${
        isInitialState ? "absolute inset-0 items-center" : "mt-2"
      }`}
      style={isInitialState ? { zIndex: 10 } : {}}
    >
      <motion.div layout className="w-full max-w-xl">
        <motion.div
          layout
          className={`relative overflow-visible shadow-[0_4px_24px_rgba(0,0,0,0.12),0_0_48px_rgba(0,0,0,0.08)] bg-white/40 ${
            isDropdownOpen ? "" : "backdrop-blur-sm"
          } ${isInitialState ? "rounded-2xl" : "rounded-t-2xl"}`}
          style={{
            transition:
              "background-color 400ms ease-out, box-shadow 400ms ease-out",
          }}
        >
          <div
            className={`absolute inset-0 z-[1] overflow-hidden shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.4),inset_-1px_-1px_1px_1px_rgba(255,255,255,0.4)] ${
              isInitialState ? "rounded-2xl" : "rounded-t-2xl"
            }`}
          />

          <div className="relative z-[2]">
            {/* Textarea input */}
            <textarea
              ref={textareaRef}
              value={userMessage}
              onChange={(e) => {
                onUserMessageChange(e.target.value);
                autoResizeTextarea(e.target as HTMLTextAreaElement);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (
                    userMessage.trim() &&
                    selectedModelsForRun.length > 0 &&
                    (isInitialState ||
                      (!showSelectionPrompt && !workflowInProgress))
                  ) {
                    onSubmit();
                  }
                }
              }}
              placeholder={
                selectedModelsForRun.length === 0
                  ? "Select models below to start..."
                  : showSelectionPrompt
                    ? "Select a version above to continue"
                    : isInitialState
                      ? "What would you like to generate?"
                      : "Update the draft..."
              }
              className={`w-full min-h-[32px] ${isInitialState ? "max-h-[300px]" : "max-h-[200px]"} px-6 pt-1.5 pb-0.5 bg-transparent resize-none outline-none text-base text-[#333333] placeholder-black/50 overflow-y-auto`}
              disabled={
                selectedModelsForRun.length === 0 ||
                showSelectionPrompt ||
                workflowInProgress
              }
              style={{
                height: "32px",
                transition: "height 0.1s ease",
                boxSizing: "border-box",
              }}
            />

            {/* Bottom section with model selector and send button */}
            <div className="relative z-50 px-4 pt-0 pb-1 flex items-center gap-2">
              <div className="flex-1">
                <ModelDropdown
                  direction="up"
                  selectedModelsForRun={selectedModelsForRun}
                  sortedAvailableModels={sortedAvailableModels}
                  isMultiSelectMode={isMultiSelectMode}
                  isDropdownOpen={isDropdownOpen}
                  onMultiSelectModeChange={onMultiSelectModeChange}
                  onModelsChange={onModelsChange}
                  onDropdownOpenChange={onDropdownOpenChange}
                  onClose={handleClose}
                />
              </div>
              <button
                onClick={onSubmit}
                disabled={
                  !userMessage.trim() ||
                  selectedModelsForRun.length === 0 ||
                  showSelectionPrompt ||
                  workflowInProgress
                }
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <Send className="w-4 h-4 text-[#333333]" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
