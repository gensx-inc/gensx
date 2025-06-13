"use client";

import { useState, useMemo } from 'react';
import { useWorkflow, GenSXWorkflowEvent } from '@gensx/react';
import { DraftEditorCard } from "@/components/ui/draft-editor-card";
import { EventColumn } from "@/components/ui/event-column";
import { GenSXOutputEvent, GenSXProgressEvent } from "@gensx/client";

import {
  CustomWorkflowEvent,
  EndContentEvent,
  ProgressEventTypes,
  ProgressStats,
  UpdateDraftInput,
  UpdateDraftOutput,
  WorkflowEventCounts,
  WorkflowEventData,
} from "./types";

export default function Home() {
  const [userMessage, setUserMessage] = useState("");
  const [previousDraft, setPreviousDraft] = useState("");
  const {
    isStreaming,
    error,
    output,
    workflowEvents: stateWorkflowEvents,
    progressEvents: stateProgressEvents,
    outputEvents: stateOutputEvents,
    stream,
    clear,
  } = useWorkflow<UpdateDraftInput, UpdateDraftOutput, GenSXProgressEvent>({
    endpoint: '/api/gensx',
    workflowName: 'updateDraft',
    defaultConfig: {
      org: "gensx",
      project: "draft-pad",
      environment: "default",
    },
  });

  // Compute workflow control events (exclude progress/output)
  const workflowControlEvents = useMemo<GenSXWorkflowEvent[]>(() =>
    stateWorkflowEvents.filter(
      (e): e is GenSXWorkflowEvent => e.type !== 'progress' && e.type !== 'output'
    ) as GenSXWorkflowEvent[]
  , [stateWorkflowEvents]);

  // Aggregate workflow events into counts and customEvents
  const workflowEventData = useMemo<WorkflowEventData>(() => {
    const counts = {
      start: 0,
      end: 0,
      'component-start': 0,
      'component-end': 0,
      error: 0,
      total: 0
    };
    const customEvents = workflowControlEvents.map(event => {
      counts[event.type] = (counts[event.type] || 0) + 1;
      counts.total++;
      let content = '';
      if (event.type === 'start') {
        content = `${event.workflowName} ${event.workflowExecutionId}`;
      } else if (event.type === 'component-start' || event.type === 'component-end') {
        content = `${event.componentName} ${event.componentId}`;
      } else if (event.type === 'error') {
        content = event.error || 'Unknown error';
      }
      return { id: event.id, type: event.type, content, timestamp: new Date(event.timestamp) };
    });
    return { counts, customEvents };
  }, [workflowControlEvents]);

  // Parse structured progress events
  const parsedProgressEvents = useMemo<ProgressEventTypes[]>(() =>
    stateProgressEvents
      .map(e => {
        try {
          return JSON.parse((e as any).data) as ProgressEventTypes;
        } catch {
          return null;
        }
      })
      .filter((ev): ev is ProgressEventTypes => ev !== null)
  , [stateProgressEvents]);

  // Compute progress stats
  const progressStats = useMemo<ProgressStats>(() => {
    const stats: ProgressStats = { starts: 0, ends: 0, isActive: false };
    parsedProgressEvents.forEach(ev => {
      if (ev.type === 'startContent') stats.starts++;
      else if (ev.type === 'endContent') stats.ends++;
    });
    stats.isActive = stats.starts > stats.ends;
    return stats;
  }, [parsedProgressEvents]);

  // Compute output string
  const contentEventsValue = output || '';

  const handleSubmit = async () => {
    if (!userMessage.trim() || isStreaming) return;
    if (output) {
      setPreviousDraft(output);
    }
    clear();

    const message = userMessage.trim();
    setUserMessage(""); // Clear the input immediately after submission

    await stream({
      userMessage: message,
      currentDraft: output || previousDraft || "",
    });
  };

  return (
    <div className="min-h-screen">
      <div className="min-h-screen p-4">
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <h1 className="text-3xl font-bold text-[#333333] font-atma text-center">
                Draft Pad
              </h1>
              <DraftEditorCard
                output={output}
                isStreaming={isStreaming}
                error={error}
                userMessage={userMessage}
                onUserMessageChange={setUserMessage}
                onSubmit={handleSubmit}
              />
            </div>

            <EventColumn<GenSXWorkflowEvent, WorkflowEventData>
              title="Workflow Events"
              value={workflowEventData}
              events={workflowControlEvents}
              stateEvents={stateWorkflowEvents}
            />

            <EventColumn<ProgressEventTypes, ProgressStats>
              title="Progress Events"
              value={progressStats}
              events={parsedProgressEvents}
              stateEvents={stateProgressEvents}
              emptyMessage="No start/end events yet"
            />

            <EventColumn<GenSXOutputEvent, string>
              title="Output Events"
              value={contentEventsValue}
              events={stateOutputEvents}
              stateEvents={stateOutputEvents}
              emptyMessage="No output events yet"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
