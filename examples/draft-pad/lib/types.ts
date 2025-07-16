// Version history types
export interface ModelResponse {
  modelId: string;
  content: string;
  displayName?: string; // Store the display name with the response
  // Generation metrics
  generationTime?: number;
  inputTokens?: number;
  outputTokens?: number;
  wordCount: number;
  charCount: number;
  cost?: {
    input: number;
    output: number;
    total: number;
  };
}

export interface ContentVersion {
  id: string;
  version: number;
  timestamp: Date;
  modelResponses: ModelResponse[];
  selectedModelId: string | null; // Which model was chosen for this version
  userMessage: string; // The prompt that generated this version
}

export type VersionHistory = ContentVersion[];
