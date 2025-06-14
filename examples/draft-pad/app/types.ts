// Re-export all workflow types from the single source of truth
export {
  type StartContentEvent,
  type EndContentEvent,
  type DraftProgress,
  type UpdateDraftInput,
  type UpdateDraftOutput
} from '@/gensx/workflows';

// Additional types specific to the UI/app layer
export type CustomWorkflowEvent = {
  id: string;
  type: 'start' | 'end' | 'output' | 'component-start' | 'component-end' | 'error';
  content: string;
  timestamp: Date;
}

export type WorkflowEventCounts = {
  start: number;
  end: number;
  'component-start': number;
  'component-end': number;
  error: number;
  total: number;
};

export type WorkflowEventData = {
  counts: WorkflowEventCounts;
  customEvents: CustomWorkflowEvent[];
};

export type ProgressStats = {
  starts: number;
  ends: number;
  isActive: boolean;
};
