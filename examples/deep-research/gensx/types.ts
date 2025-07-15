export interface SearchResult {
  title: string;
  url: string;
  description: string;
  relevanceScore?: number;
  content?: string;
  snippet?: string;
  status?: "pending" | "completed";
  favicon?: string;
}

export interface QueryResult {
  query: string;
  results: SearchResult[];
}

export type StepType =
  | "plan"
  | "write-queries"
  | "execute-queries"
  | "evaluate"
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
  queryResults: QueryResult[];
}

export interface EvaluateStep {
  type: "evaluate";
  isSufficient: boolean;
  analysis: string;
  followUpQueries: string[];
}

export interface GenerateReportStep {
  type: "generate-report";
  report: string;
}

export type DeepResearchStep =
  | PlanStep
  | WriteQueriesStep
  | ExecuteQueriesStep
  | EvaluateStep
  | GenerateReportStep;
