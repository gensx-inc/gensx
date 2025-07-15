// Version history types
export interface ContentVersion {
  id: string;
  version: number;
  content: string;
  modelId: string;
  timestamp: Date;
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

export type VersionHistory = Record<string, ContentVersion[]>;
