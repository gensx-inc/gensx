"use client";

import { type ModelConfig } from "@/gensx/workflows";
import { type UseVoiceCommandsReturn } from "@/hooks/useVoiceCommands";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { Send } from "lucide-react";
import { motion } from "motion/react";
import { RefObject, useCallback, useEffect, useRef } from "react";

import { ModelDropdown } from "./ModelDropdown";
import { VoiceButton } from "./VoiceButton";

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
  _inputRef: RefObject<HTMLInputElement>;
  isVoiceActive?: boolean;
  onUserMessageChange: (value: string) => void;
  onMultiSelectModeChange: (value: boolean) => void;
  onModelsChange: (models: ModelConfig[]) => void;
  onDropdownOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onVoiceActiveChange?: (active: boolean) => void;
  voiceCommands?: UseVoiceCommandsReturn;
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
  _inputRef,
  isVoiceActive: _isVoiceActive,
  onUserMessageChange,
  onMultiSelectModeChange,
  onModelsChange,
  onDropdownOpenChange,
  onSubmit,
  onVoiceActiveChange,
  voiceCommands,
}: InputSectionProps) {
  // Voice recording hook
  const voice = useVoiceRecording();

  // Store the latest transcribed text in a ref to avoid stale closures
  const transcribedTextRef = useRef<string>("");

  // Store whether we should auto-submit after voice transcription
  const shouldAutoSubmitRef = useRef(false);

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
    const textarea = textareaRef.current;
    textarea.style.height = "32px";
    textarea.style.transition = "height 0.1s ease";
    textarea.style.boxSizing = "border-box";
  }, []);

  // Handle voice transcription completion - ENHANCED with voice commands
  useEffect(() => {
    if (voice.transcription?.trim()) {
      const transcribedText = voice.transcription.trim();

      // Store in ref
      transcribedTextRef.current = transcribedText;

      // Try to process as voice command first (async)
      if (voiceCommands) {
        voiceCommands
          .processVoiceCommand(transcribedText)
          .then((commandHandled) => {
            if (!commandHandled) {
              // Set the text in the input field (original behavior)
              onUserMessageChange(transcribedText);

              // Check if we should auto-submit and mark it
              if (
                selectedModelsForRun.length > 0 &&
                !showSelectionPrompt &&
                !workflowInProgress
              ) {
                shouldAutoSubmitRef.current = true;
              }
            }
          })
          .catch((error: unknown) => {
            console.error("Error processing voice command:", error);
            // Fallback to text input on error
            onUserMessageChange(transcribedText);

            if (
              selectedModelsForRun.length > 0 &&
              !showSelectionPrompt &&
              !workflowInProgress
            ) {
              shouldAutoSubmitRef.current = true;
            }
          });
      } else {
        // No voice commands available, fallback to text input
        onUserMessageChange(transcribedText);

        if (
          selectedModelsForRun.length > 0 &&
          !showSelectionPrompt &&
          !workflowInProgress
        ) {
          shouldAutoSubmitRef.current = true;
        }
      }

      // Clear transcription to prevent loops
      voice.clearTranscription();
    }
  }, [
    voice.transcription,
    selectedModelsForRun.length,
    showSelectionPrompt,
    workflowInProgress,
    onUserMessageChange,
    voice.clearTranscription,
    voiceCommands,
  ]);

  // Watch for userMessage changes and auto-submit if needed
  useEffect(() => {
    if (
      shouldAutoSubmitRef.current &&
      userMessage.trim() === transcribedTextRef.current
    ) {
      shouldAutoSubmitRef.current = false; // Reset flag
      setTimeout(() => {
        onSubmit();
      }, 50); // Short delay to ensure all state updates are complete
    }
  }, [userMessage, onSubmit]);

  // Handle manual form submission
  const handleManualSubmit = useCallback(() => {
    onSubmit();
  }, [onSubmit]);

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

  const handleClose = () => {
    setTimeout(() => {
      // Focus on the textarea after dropdown closes
      textareaRef.current.focus();
    }, 100);
  };

  const isInitialState = sortedModelStreamsLength === 0 && !workflowInProgress;
  // Keep track of voice state for parent component, but don't hide input
  const isVoiceActive =
    voice.isRecording ||
    voice.isTranscribing ||
    (voiceCommands?.isProcessingCommand ?? false);

  // Notify parent component when voice active state changes
  useEffect(() => {
    if (onVoiceActiveChange) {
      onVoiceActiveChange(isVoiceActive);
    }
  }, [isVoiceActive, onVoiceActiveChange]);

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
      <motion.div layout className="w-full max-w-xl flex items-center gap-3">
        <motion.div
          layout
          className={`relative overflow-visible shadow-[0_4px_24px_rgba(0,0,0,0.12),0_0_48px_rgba(0,0,0,0.08)] bg-white/40 ${
            isDropdownOpen ? "" : "backdrop-blur-sm"
          } ${isInitialState ? "rounded-2xl" : "rounded-t-2xl"} flex-1`}
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
            {/* Voice visualization is now handled inside the voice button */}

            {/* Textarea input - always visible since voice visualization is in button */}
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
                    handleManualSubmit();
                  }
                }
              }}
              placeholder={
                selectedModelsForRun.length === 0
                  ? "Select models below to start, or use voice commands..."
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

            {/* Bottom section with model selector and send button - always visible now */}
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

              {/* Send button - to the right of input */}
              <button
                onClick={handleManualSubmit}
                disabled={
                  !userMessage.trim() ||
                  selectedModelsForRun.length === 0 ||
                  showSelectionPrompt ||
                  workflowInProgress
                }
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
              >
                <Send className="w-4 h-4 text-[#333333]" />
              </button>
            </div>

            {/* Empty space when voice is active - voice button is now positioned outside */}

            {/* Voice error display */}
            {voice.error && (
              <div className="px-4 pb-2">
                <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {voice.error}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Voice button - positioned outside and to the right of the input container */}
        <VoiceButton
          isRecording={voice.isRecording}
          isTranscribing={voice.isTranscribing}
          isProcessingCommand={voiceCommands?.isProcessingCommand}
          commandFeedback={voiceCommands?.commandFeedback}
          audioLevels={voice.audioLevels}
          disabled={false}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
        />
      </motion.div>
    </motion.div>
  );
}
