export interface VoiceAction {
  type:
    | "text_input"
    | "model_selection"
    | "sorting"
    | "diff_control"
    | "version_navigation"
    | "ui_control";
  action: string;
  parameters?: Record<string, unknown>;
}

export interface ModelSelectionAction extends VoiceAction {
  type: "model_selection";
  action:
    | "add"
    | "remove"
    | "select_only"
    | "set_single"
    | "clear"
    | "toggle_multi_select";
  parameters: {
    models?: string[];
    model?: string; // For set_single action
    matchType?: "exact" | "partial" | "provider";
    provider?: string; // Legacy - keeping for compatibility
    count?: number;
  };
}

export interface SortingAction extends VoiceAction {
  type: "sorting";
  action: "sort_generations" | "sort_models";
  parameters: {
    field: "words" | "time" | "cost" | "context" | "maxOutput";
    direction?: "asc" | "desc" | "toggle";
  };
}

export interface DiffControlAction extends VoiceAction {
  type: "diff_control";
  action: "show" | "hide" | "toggle";
}

export interface VersionNavigationAction extends VoiceAction {
  type: "version_navigation";
  action: "previous" | "next" | "goto" | "latest";
  parameters?: {
    version?: number;
  };
}

export interface UIControlAction extends VoiceAction {
  type: "ui_control";
  action: "open_model_selector" | "close_model_selector" | "focus_input";
}

export interface TextInputAction extends VoiceAction {
  type: "text_input";
  action: "submit";
  parameters: {
    text: string;
  };
}

export type ParsedVoiceAction =
  | ModelSelectionAction
  | SortingAction
  | DiffControlAction
  | VersionNavigationAction
  | UIControlAction
  | TextInputAction;

/**
 * Voice command processor using LLM API
 */
export const VoiceCommandProcessor = {
  /**
   * Process a voice transcription using LLM and return the appropriate action
   */
  async parseCommand(
    transcription: string,
    availableModels?: unknown[],
  ): Promise<ParsedVoiceAction | null> {
    try {
      const response = await fetch("/api/voice-commands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcription,
          availableModels,
        }),
      });

      if (!response.ok) {
        console.error("Voice command API error:", response.status);
        return null;
      }

      const result = await response.json();

      if (result.success && result.action) {
        return result.action as ParsedVoiceAction;
      }

      return null;
    } catch (error) {
      console.error("Error calling voice command API:", error);
      return null;
    }
  },
};
