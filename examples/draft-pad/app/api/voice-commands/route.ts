import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Tool definitions for voice commands
const voiceCommandTools = {
  addModels: {
    description: "Add specific models to the current selection",
    inputSchema: z.object({
      models: z
        .array(z.string())
        .describe(
          "Array of specific model names or identifiers to add. Use exact model names from available models list like 'gpt-4o', 'claude-3-5-sonnet', 'gemini-pro'. For providers, use 'openai', 'anthropic', 'google'. Examples: ['gpt-4o'], ['claude-3-5-sonnet', 'gpt-4o'], ['openai']",
        ),
      matchType: z
        .enum(["exact", "partial", "provider"])
        .optional()
        .describe(
          "How to match the model names: 'exact' for exact model names, 'partial' for partial matches, 'provider' for provider-based matching",
        ),
    }),
  },

  removeModels: {
    description: "Remove specific models from the current selection",
    inputSchema: z.object({
      models: z
        .array(z.string())
        .describe(
          "Array of specific model names or identifiers to remove. Use exact model names like 'gpt-4o', 'claude-3-5-sonnet', or providers like 'openai', 'anthropic'",
        ),
      matchType: z
        .enum(["exact", "partial", "provider"])
        .optional()
        .describe(
          "How to match the model names: 'exact' for exact model names, 'partial' for partial matches, 'provider' for provider-based matching",
        ),
    }),
  },

  selectOnlyModels: {
    description:
      "Replace current selection with only the specified models (clear others and select these)",
    inputSchema: z.object({
      models: z
        .array(z.string())
        .describe(
          "Array of specific model names to select exclusively. All other models will be deselected. Use exact model names like 'gpt-4o', 'claude-3-5-sonnet'",
        ),
      matchType: z
        .enum(["exact", "partial", "provider"])
        .optional()
        .describe(
          "How to match the model names: 'exact' for exact model names, 'partial' for partial matches, 'provider' for provider-based matching",
        ),
    }),
  },

  setToSingleModel: {
    description:
      "Set selection to exactly one specific model (clear all others and select only this one)",
    inputSchema: z.object({
      model: z
        .string()
        .describe(
          "Single model name or identifier to select exclusively. Use exact model names like 'gpt-4o', 'claude-3-5-sonnet', 'gemini-pro'",
        ),
      matchType: z
        .enum(["exact", "partial", "provider"])
        .optional()
        .describe(
          "How to match the model name: 'exact' for exact model name, 'partial' for partial match, 'provider' for first model from provider",
        ),
    }),
  },

  clearAllModels: {
    description: "Remove all models from selection",
    inputSchema: z.object({}),
  },

  toggleMultiSelect: {
    description: "Toggle between single and multi-select mode",
    inputSchema: z.object({}),
  },

  // Sorting actions
  sortGenerations: {
    description: "Sort the generated responses by a specific metric",
    inputSchema: z.object({
      field: z
        .enum(["words", "time", "cost"])
        .describe("Field to sort by: words, generation time, or cost"),
    }),
  },

  sortModels: {
    description: "Sort the available models by a specific metric",
    inputSchema: z.object({
      field: z
        .enum(["cost", "context", "maxOutput"])
        .describe(
          "Field to sort models by: cost, context window, or max output",
        ),
    }),
  },

  // Diff control actions
  showDiff: {
    description: "Show differences between model responses",
    inputSchema: z.object({}),
  },

  hideDiff: {
    description: "Hide differences between model responses",
    inputSchema: z.object({}),
  },

  toggleDiff: {
    description: "Toggle showing/hiding differences",
    inputSchema: z.object({}),
  },

  // Version navigation actions
  goToPreviousVersion: {
    description: "Navigate to the previous version",
    inputSchema: z.object({}),
  },

  goToNextVersion: {
    description: "Navigate to the next version",
    inputSchema: z.object({}),
  },

  goToVersion: {
    description: "Navigate to a specific version number",
    inputSchema: z.object({
      version: z.number().describe("Version number to navigate to"),
    }),
  },

  goToLatestVersion: {
    description: "Navigate to the latest/most recent version",
    inputSchema: z.object({}),
  },

  // UI control actions
  openModelSelector: {
    description: "Open the model selector interface",
    inputSchema: z.object({}),
  },

  closeModelSelector: {
    description: "Close the model selector interface",
    inputSchema: z.object({}),
  },
};

interface ModelInfo {
  id: string;
  provider: string;
  model: string;
  displayName?: string;
}

export async function POST(request: NextRequest) {
  // Parse request body first so we have access to transcription in error handling
  let transcription: string;
  let availableModels: unknown[] | undefined;

  try {
    const body = await request.json();
    transcription = body.transcription;
    availableModels = body.availableModels;
  } catch (_error) {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 },
    );
  }

  if (!transcription || typeof transcription !== "string") {
    return NextResponse.json(
      { error: "Transcription is required" },
      { status: 400 },
    );
  }

  try {
    console.log("Processing voice command:", transcription);

    // Create a list of available models for context
    const modelContext = availableModels
      ? (availableModels as ModelInfo[]).map((model: ModelInfo) => ({
          id: model.id,
          provider: model.provider,
          model: model.model,
          displayName: model.displayName,
        }))
      : [];

    // Format available models for the prompt
    const modelsList =
      modelContext.length > 0
        ? modelContext
            .map(
              (m) =>
                `- ${m.displayName ?? m.model} (${m.provider}) - ID: ${m.id}`,
            )
            .join("\n")
        : "No models available";

    const result = await generateText({
      model: groq("moonshotai/kimi-k2-instruct"),
      system: `You are a voice command parser. You call tools ONLY for specific UI commands. For content creation, return text_input/submit.

AVAILABLE MODELS IN THE SYSTEM:
${modelsList}

🔹 CALL TOOLS for these UI COMMANDS ONLY:

MODEL SELECTION (must include words like "add", "remove", "set", "only", "clear"):
   • "add GPT-4" → addModels tool: {models: ["gpt-4"], matchType: "partial"}
   • "remove GPT-4o" → removeModels tool: {models: ["gpt-4o"], matchType: "exact"}
   • "only use Claude" → selectOnlyModels tool: {models: ["claude"], matchType: "partial"}
   • "set to GPT-4o" → setToSingleModel tool: {model: "gpt-4o", matchType: "exact"}
   • "clear all models" → clearAllModels tool: {}

UI CONTROLS (interface manipulation):
   • "show diff" → showDiff tool: {}
   • "hide diff" → hideDiff tool: {}
   • "open models" → openModelSelector tool: {}
   • "close models" → closeModelSelector tool: {}

SORTING (explicit sorting commands):
   • "sort by cost" → sortGenerations tool: {field: "cost"}
   • "sort models by context" → sortModels tool: {field: "context"}

VERSION NAVIGATION:
   • "previous version" → goToPreviousVersion tool: {}
   • "next version" → goToNextVersion tool: {}

🚫 DO NOT CALL TOOLS for CONTENT CREATION (these should be text_input/submit):
   • Anything starting with "Write", "Create", "Generate", "Explain", "Tell me", "What is"
   • Questions about topics: "How does AI work?"
   • Content requests: "Make a poem", "Draft an email"
   • General statements without UI command words

MATCHING TYPES:
- "exact": specific model names like "gpt-4o", "claude-3-5-sonnet"
- "partial": common names like "gpt", "claude", "gemini"
- "provider": provider names like "openai", "anthropic", "google"

RULE: If the text is asking for content creation or explanation, return text_input/submit. Only call tools for explicit UI operations.`,
      prompt: transcription,
      tools: voiceCommandTools,
    });

    console.log("Tool calls received:", result.toolCalls.length);

    // Check if tools were called
    if (result.toolCalls.length > 0) {
      const toolCall = result.toolCalls[0];
      console.log("Tool called:", toolCall.toolName);

      let action;

      switch (toolCall.toolName) {
        case "addModels":
          action = {
            type: "model_selection",
            action: "add",
            parameters: toolCall.args,
          };
          break;

        case "removeModels":
          action = {
            type: "model_selection",
            action: "remove",
            parameters: toolCall.args,
          };
          break;

        case "selectOnlyModels":
          action = {
            type: "model_selection",
            action: "select_only",
            parameters: toolCall.args,
          };
          break;

        case "setToSingleModel":
          action = {
            type: "model_selection",
            action: "set_single",
            parameters: toolCall.args,
          };
          break;

        case "clearAllModels":
          action = {
            type: "model_selection",
            action: "clear",
            parameters: {},
          };
          break;

        case "toggleMultiSelect":
          action = {
            type: "model_selection",
            action: "toggle_multi_select",
            parameters: {},
          };
          break;

        case "sortGenerations":
          action = {
            type: "sorting",
            action: "sort_generations",
            parameters: toolCall.args,
          };
          break;

        case "sortModels":
          action = {
            type: "sorting",
            action: "sort_models",
            parameters: toolCall.args,
          };
          break;

        case "showDiff":
          action = {
            type: "diff_control",
            action: "show",
            parameters: {},
          };
          break;

        case "hideDiff":
          action = {
            type: "diff_control",
            action: "hide",
            parameters: {},
          };
          break;

        case "toggleDiff":
          action = {
            type: "diff_control",
            action: "toggle",
            parameters: {},
          };
          break;

        case "goToPreviousVersion":
          action = {
            type: "version_navigation",
            action: "previous",
            parameters: {},
          };
          break;

        case "goToNextVersion":
          action = {
            type: "version_navigation",
            action: "next",
            parameters: {},
          };
          break;

        case "goToVersion":
          action = {
            type: "version_navigation",
            action: "goto",
            parameters: toolCall.args,
          };
          break;

        case "goToLatestVersion":
          action = {
            type: "version_navigation",
            action: "latest",
            parameters: {},
          };
          break;

        case "openModelSelector":
          action = {
            type: "ui_control",
            action: "open_model_selector",
            parameters: {},
          };
          break;

        case "closeModelSelector":
          action = {
            type: "ui_control",
            action: "close_model_selector",
            parameters: {},
          };
          break;

        default:
          // Unknown tool, fall back to text input
          action = {
            type: "text_input",
            action: "submit",
            parameters: {
              text: transcription,
            },
          };
      }

      return NextResponse.json({
        success: true,
        action: action,
      });
    }

    // No tools called - treat as text input
    return NextResponse.json({
      success: true,
      action: {
        type: "text_input",
        action: "submit",
        parameters: {
          text: transcription,
        },
      },
    });
  } catch (error) {
    console.error("Voice command parsing error:", error);

    // Fallback to text input on error - use the transcription we already parsed
    return NextResponse.json({
      success: true,
      action: {
        type: "text_input",
        action: "submit",
        parameters: {
          text: transcription,
        },
      },
    });
  }
}
