export interface SearchResult {
  title: string;
  url: string;
  description: string;
  relevanceScore?: number;
  content?: string;
}

export type StepType =
  | "plan"
  | "write-queries"
  | "execute-queries"
  | "evaluate-research"
  | "generate-report";

export interface PlanStep {
  type: "plan";
  plan: string;
}

export interface WriteQueriesStep {
  type: "write-queries";
  queries: string[];
}

export interface ExecuteQueriesStep {
  type: "execute-queries";
  searchResults: SearchResult[];
}

export interface EvaluateResearchStep {
  type: "evaluate-research";
  searchResults: SearchResult[];
}

export interface GenerateReportStep {
  type: "generate-report";
  report: string;
}

export type DeepResearchStep =
  | PlanStep
  | WriteQueriesStep
  | ExecuteQueriesStep
  | EvaluateResearchStep
  | GenerateReportStep;
