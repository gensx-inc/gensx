'use client';

import { useState } from 'react';
import { useGenSXWorkflow, GenSXWorkflowEvent } from '@gensx/react';
import { DraftEditorCard } from "@/components/ui/draft-editor-card";
import { EventColumn } from "@/components/ui/event-column";
import { GenSXOutputEvent, GenSXProgressEvent } from '@gensx/client';
import {
  StartContentEvent,
  EndContentEvent,
  ProgressEventTypes,
  CustomWorkflowEvent,
  WorkflowEventCounts,
  UpdateDraftInput,
  UpdateDraftOutput,
  WorkflowEventData,
  ProgressStats
} from './types';

export default function Home() {
  const [userMessage, setUserMessage] = useState('');
  const [previousDraft, setPreviousDraft] = useState('');
  const {
    isStreaming,
    error,
    output,
    //events: stateEvents,
    workflowEvents: stateWorkflowEvents,
    progressEvents: stateProgressEvents,
    outputEvents: stateOutputEvents,
    run,
    stream,
    stop,
    clear,
    useOutputEvents,
    useProgressEvents,
    useWorkflowEvents,
    // need to update the events to be baseprogressevent instead of genSXProgressEvent
  } = useGenSXWorkflow<UpdateDraftInput, UpdateDraftOutput, GenSXProgressEvent>({
    endpoint: '/api/gensx',
    workflowName: 'updateDraft',
    defaultConfig: {
      org: 'gensx',
      project: 'draft-pad',
      environment: 'default',
    },
  });

  const {events: workflowEvents, value: workflowEventData} = useWorkflowEvents<GenSXWorkflowEvent, WorkflowEventData>({
    reducer: {
      reduce: (acc: WorkflowEventData, event: GenSXWorkflowEvent): WorkflowEventData => {
        const newEvent: CustomWorkflowEvent = (() => {
          if (event.type === 'start') {
            return {
              id: event.id,
              type: event.type,
              content: event.workflowName + ' ' + event.workflowExecutionId,
              timestamp: new Date(event.timestamp),
            };
          } else if (event.type === 'end') {
            return {
              id: event.id,
              type: event.type,
              content: "",
              timestamp: new Date(event.timestamp),
            };
          } else if (event.type === 'component-start') {
            return {
              id: event.id,
              type: event.type,
              content: event.componentName + ' ' + event.componentId,
              timestamp: new Date(event.timestamp),
            };
          } else if (event.type === 'component-end') {
            return {
              id: event.id,
              type: event.type,
              content: event.componentName + ' ' + event.componentId,
              timestamp: new Date(event.timestamp),
            };
          } else if (event.type === 'error') {
            return {
              id: event.id,
              type: event.type,
              content: event.error || 'Unknown error',
              timestamp: new Date(event.timestamp),
            };
          }
          return {
            id: (event as any).id,
            type: 'error' as const,
            content: 'Unknown event type',
            timestamp: new Date((event as any).timestamp),
          };
        })();

        const newCounts = { ...acc.counts };
        newCounts[event.type] = (newCounts[event.type] || 0) + 1;
        newCounts.total = newCounts.total + 1;

        return {
          counts: newCounts,
          customEvents: [...acc.customEvents, newEvent]
        };
      },
      initial: {
        counts: {
          start: 0,
          end: 0,
          'component-start': 0,
          'component-end': 0,
          error: 0,
          total: 0
        } as WorkflowEventCounts,
        customEvents: [] as CustomWorkflowEvent[]
      }
    }
  });

  const {events: progressEvents, value: progressStats} = useProgressEvents<ProgressEventTypes, ProgressStats>(
    ['startContent', 'endContent'],
    {
      reducer: {
        reduce: (acc: ProgressStats, event: StartContentEvent | EndContentEvent) => ({
          starts: acc.starts + (event.type === 'startContent' ? 1 : 0),
          ends: acc.ends + (event.type === 'endContent' ? 1 : 0),
          isActive: (acc.starts + (event.type === 'startContent' ? 1 : 0)) >
                    (acc.ends + (event.type === 'endContent' ? 1 : 0))
        }),
        initial: { starts: 0, ends: 0, isActive: false }
      }
    }
  );

  // in the future, we could make this actually reduce it from a partial json object to actually fill the type put in the generic
  // (i.e. if we have a partial json object, we can fill the type with the partial json object which is very useful for the output events)
  const {events: contentEvents, value: contentEventsValue} = useOutputEvents<GenSXOutputEvent, string>({
    reducer: {
       reduce: (acc: string, event: GenSXOutputEvent) => acc + event.content,
       initial: '' as string
     }
  });

  const handleSubmit = async () => {
    if (!userMessage.trim() || isStreaming) return;
    if (output) {
      setPreviousDraft(output);
    }
    clear();

    const message = userMessage.trim();
    setUserMessage(''); // Clear the input immediately after submission

    await stream({
      userMessage: message,
      currentDraft: output || previousDraft || '',
    });
  };

  return (
    <div className="min-h-screen">
      <div className="min-h-screen p-4">
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <h1 className="text-3xl font-bold text-[#333333] font-atma text-center">Draft Pad</h1>
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
            events={workflowEvents}
            stateEvents={stateWorkflowEvents}
          />

          <EventColumn<ProgressEventTypes, ProgressStats>
            title="Progress Events"
            value={progressStats}
            events={progressEvents}
            stateEvents={stateProgressEvents}
            emptyMessage="No start/end events yet"
          />

          <EventColumn<GenSXOutputEvent, string>
            title="Output Events"
            value={contentEventsValue}
            events={contentEvents}
            stateEvents={stateOutputEvents}
            emptyMessage="No output events yet"
          />
        </div>
      </div>
      </div>

    </div>
  );
}
