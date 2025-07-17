"use client";

import { type ModelConfig } from "@/gensx/workflows";
import {
  type ParsedVoiceAction,
  VoiceCommandProcessor,
} from "@/lib/voice-commands";
import { useCallback, useEffect, useState } from "react";

export interface VoiceActionsInterface {
  // Model selection actions
  addModels: (
    modelNames: string[],
    matchType?: "exact" | "partial" | "provider",
  ) => void;
  removeModels: (
    modelNames: string[],
    matchType?: "exact" | "partial" | "provider",
  ) => void;
  selectOnlyModels: (
    modelNames: string[],
    matchType?: "exact" | "partial" | "provider",
  ) => void;
  setToSingleModel: (
    modelName: string,
    matchType?: "exact" | "partial" | "provider",
  ) => void;
  clearAllModels: () => void;
  toggleMultiSelect: () => void;

  // Sorting actions
  sortGenerations: (field: "words" | "time" | "cost") => void;
  sortModels: (field: "cost" | "context" | "maxOutput") => void;

  // Diff control actions
  showDiff: () => void;
  hideDiff: () => void;
  toggleDiff: () => void;

  // Version navigation actions
  goToPreviousVersion: () => void;
  goToNextVersion: () => void;
  goToVersion: (version: number) => void;
  goToLatestVersion: () => void;

  // UI control actions
  openModelSelector: () => void;
  closeModelSelector: () => void;

  // Text input actions
  submitText: (text: string) => void;
}

export interface UseVoiceCommandsOptions {
  availableModels: ModelConfig[];
  selectedModelsForRun: ModelConfig[];
  actions: VoiceActionsInterface;
  isVoiceActive?: boolean;
}

export interface UseVoiceCommandsReturn {
  isProcessingCommand: boolean;
  lastCommand: ParsedVoiceAction | null;
  commandFeedback: string | null;
  processVoiceCommand: (transcription: string) => Promise<boolean>;
  clearFeedback: () => void;
}

export function useVoiceCommands({
  availableModels,
  selectedModelsForRun: _selectedModelsForRun,
  actions,
  isVoiceActive: _isVoiceActive = false,
}: UseVoiceCommandsOptions): UseVoiceCommandsReturn {
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [lastCommand, setLastCommand] = useState<ParsedVoiceAction | null>(
    null,
  );
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

  // Clear feedback after some time
  useEffect(() => {
    if (commandFeedback) {
      const timer = setTimeout(() => {
        setCommandFeedback(null);
      }, 3000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [commandFeedback]);

  // Helper function to find models by name/provider
  const findModelsByNames = useCallback(
    (modelNames: string[]): ModelConfig[] => {
      const foundModels: ModelConfig[] = [];

      for (const name of modelNames) {
        // Find models that match the name in their ID, model name, or provider
        const matches = availableModels.filter((model) => {
          const modelLower = model.model.toLowerCase();
          const providerLower = model.provider.toLowerCase();
          const displayNameLower = model.displayName?.toLowerCase() ?? "";
          const nameLower = name.toLowerCase();

          return (
            modelLower.includes(nameLower) ||
            providerLower.includes(nameLower) ||
            displayNameLower.includes(nameLower)
          );
        });

        foundModels.push(...matches);
      }

      // Remove duplicates
      const uniqueModels = foundModels.filter(
        (model, index, array) =>
          array.findIndex((m) => m.id === model.id) === index,
      );

      return uniqueModels;
    },
    [availableModels],
  );

  // Generate feedback messages for actions
  const generateFeedback = useCallback((action: ParsedVoiceAction): string => {
    switch (action.type) {
      case "model_selection":
        switch (action.action) {
          case "add":
            const addCount = action.parameters.models?.length ?? 0;
            return `Added ${addCount} model${addCount === 1 ? "" : "s"}`;
          case "remove":
            const removeCount = action.parameters.models?.length ?? 0;
            return `Removed ${removeCount} model${removeCount === 1 ? "" : "s"}`;
          case "select_only":
            const selectCount = action.parameters.models?.length ?? 0;
            return `Selected only ${selectCount} model${selectCount === 1 ? "" : "s"}`;
          case "set_single":
            return `Set single model to ${action.parameters.model}`;
          case "clear":
            return "Cleared all models";
          case "toggle_multi_select":
            return "Toggled multi-select mode";
          default:
            return "Model selection updated";
        }
      case "sorting":
        const field = action.parameters.field;
        if (action.action === "sort_generations") {
          return `Sorted generations by ${field}`;
        } else {
          return `Sorted models by ${field}`;
        }
      case "diff_control":
        switch (action.action) {
          case "show":
            return "Showing diff";
          case "hide":
            return "Hiding diff";
          case "toggle":
            return "Toggled diff display";
          default:
            return "Diff display updated";
        }
      case "version_navigation":
        switch (action.action) {
          case "previous":
            return "Navigated to previous version";
          case "next":
            return "Navigated to next version";
          case "goto":
            return `Navigated to version ${action.parameters?.version}`;
          case "latest":
            return "Navigated to latest version";
          default:
            return "Version navigation updated";
        }
      case "ui_control":
        switch (action.action) {
          case "open_model_selector":
            return "Opened model selector";
          case "close_model_selector":
            return "Closed model selector";
          case "focus_input":
            return "Focused input field";
          default:
            return "UI updated";
        }
      case "text_input":
        return "Submitting text input";
      default:
        return "Command processed";
    }
  }, []);

  // Execute the parsed voice action
  const executeAction = useCallback(
    (action: ParsedVoiceAction): void => {
      try {
        switch (action.type) {
          case "model_selection":
            switch (action.action) {
              case "add":
                if (action.parameters.models) {
                  actions.addModels(
                    action.parameters.models,
                    action.parameters.matchType,
                  );
                }
                break;
              case "remove":
                if (action.parameters.models) {
                  actions.removeModels(
                    action.parameters.models,
                    action.parameters.matchType,
                  );
                }
                break;
              case "select_only":
                if (action.parameters.models) {
                  actions.selectOnlyModels(
                    action.parameters.models,
                    action.parameters.matchType,
                  );
                }
                break;
              case "set_single":
                if (action.parameters.model) {
                  actions.setToSingleModel(
                    action.parameters.model,
                    action.parameters.matchType,
                  );
                }
                break;
              case "clear":
                actions.clearAllModels();
                break;
              case "toggle_multi_select":
                actions.toggleMultiSelect();
                break;
            }
            break;

          case "sorting":
            if (action.action === "sort_generations") {
              actions.sortGenerations(
                action.parameters.field as "words" | "time" | "cost",
              );
            } else {
              actions.sortModels(
                action.parameters.field as "cost" | "context" | "maxOutput",
              );
            }
            break;

          case "diff_control":
            switch (action.action) {
              case "show":
                actions.showDiff();
                break;
              case "hide":
                actions.hideDiff();
                break;
              case "toggle":
                actions.toggleDiff();
                break;
            }
            break;

          case "version_navigation":
            switch (action.action) {
              case "previous":
                actions.goToPreviousVersion();
                break;
              case "next":
                actions.goToNextVersion();
                break;
              case "goto":
                if (action.parameters?.version) {
                  actions.goToVersion(action.parameters.version);
                }
                break;
              case "latest":
                actions.goToLatestVersion();
                break;
            }
            break;

          case "ui_control":
            switch (action.action) {
              case "open_model_selector":
                actions.openModelSelector();
                break;
              case "close_model_selector":
                actions.closeModelSelector();
                break;
            }
            break;

          case "text_input":
            if (action.parameters.text) {
              actions.submitText(action.parameters.text);
            }
            break;
        }
      } catch (error) {
        console.error("Error executing voice command:", error);
        setCommandFeedback("Error executing command");
      }
    },
    [actions, findModelsByNames],
  );

  // Process voice command from transcription
  const processVoiceCommand = useCallback(
    async (transcription: string): Promise<boolean> => {
      if (!transcription.trim()) {
        return false;
      }

      setIsProcessingCommand(true);

      try {
        // Parse the command using LLM with available models context
        const action = await VoiceCommandProcessor.parseCommand(
          transcription,
          availableModels,
        );

        if (!action) {
          setIsProcessingCommand(false);
          return false;
        }

        setLastCommand(action);

        // Check if it's a text input command (default behavior)
        if (action.type === "text_input") {
          setIsProcessingCommand(false);
          return false; // Let the normal text input flow handle this
        }

        // Execute the action
        executeAction(action);

        // Generate feedback
        const feedback = generateFeedback(action);
        setCommandFeedback(feedback);

        setIsProcessingCommand(false);
        return true; // Command was handled
      } catch (error) {
        console.error("Error processing voice command:", error);
        setCommandFeedback("Error processing command");
        setIsProcessingCommand(false);
        return false;
      }
    },
    [executeAction, generateFeedback, availableModels],
  );

  const clearFeedback = useCallback(() => {
    setCommandFeedback(null);
  }, []);

  return {
    isProcessingCommand,
    lastCommand,
    commandFeedback,
    processVoiceCommand,
    clearFeedback,
  };
}
