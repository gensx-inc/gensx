import { BaseProgressEvent, GenSXWorkflowEvent } from '@gensx/react';
import { GenSXOutputEvent, GenSXProgressEvent } from '@gensx/client';

export type StartContentEvent = BaseProgressEvent & {
  type: "startContent";
  content: string;
  timestamp: string;
};

export type EndContentEvent = BaseProgressEvent & {
  type: "endContent";
  content: string;
  timestamp: string;
};

export type ProgressEventTypes = EndContentEvent | StartContentEvent;

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

export type UpdateDraftInput = {
  userMessage: string;
  currentDraft: string;
};

export type UpdateDraftOutput = string;

export type WorkflowEventData = {
  counts: WorkflowEventCounts;
  customEvents: CustomWorkflowEvent[];
};

export type ProgressStats = {
  starts: number;
  ends: number;
  isActive: boolean;
};
