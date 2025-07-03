// Version history types
export interface ContentVersion {
  id: string;
  version: number;
  content: string;
  modelId: string;
  timestamp: Date;
}

export type VersionHistory = Record<string, ContentVersion[]>;
