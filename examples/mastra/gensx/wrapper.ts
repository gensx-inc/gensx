import type { Workflow as MastraWorkflow } from "@mastra/core/workflows";

import * as gensx from "@gensx/core";
import { Mastra } from "@mastra/core/mastra";
import { z } from "zod";

type WorkflowsOf<M> =
  M extends Mastra<any, any, infer W, any, any, any, any, any, any>
    ? W
    : Record<string, MastraWorkflow>;
type AgentsOf<M> =
  M extends Mastra<infer TAgents, any, any, any, any, any, any, any, any>
    ? TAgents
    : Record<string, unknown>;

type InputSchemaOf<Wf> =
  Wf extends MastraWorkflow<any, any, any, infer In, any, any>
    ? In
    : z.ZodTypeAny;
type OutputSchemaOf<Wf> =
  Wf extends MastraWorkflow<any, any, any, any, infer Out, any>
    ? Out
    : z.ZodTypeAny;

type WrappedWorkflows<
  M extends Mastra<any, any, any, any, any, any, any, any, any>,
> = {
  [K in keyof WorkflowsOf<M> & string]: (
    props: z.infer<InputSchemaOf<WorkflowsOf<M>[K]>>,
  ) => Promise<z.infer<OutputSchemaOf<WorkflowsOf<M>[K]>>>;
};

type WrappedAgents<
  M extends Mastra<any, any, any, any, any, any, any, any, any>,
> = Record<
  keyof AgentsOf<M> & string,
  (args: { content: string }) => Promise<string>
>;

export function wrapMastra<
  M extends Mastra<any, any, any, any, any, any, any, any, any>,
>(instance: M): WrappedWorkflows<M> & WrappedAgents<M> {
  const wrapped: Record<string, unknown> = {};

  const workflows = instance.getWorkflows() as WorkflowsOf<M>;
  for (const id of Object.keys(workflows) as (keyof WorkflowsOf<M> &
    string)[]) {
    const wf = workflows[id];
    wrapped[id] = gensx.Workflow(id, (async (
      props: z.infer<InputSchemaOf<typeof wf>>,
    ) => {
      try {
        const run = await wf.createRunAsync();
        const result = await run.start({ inputData: props });
        const status = (result as { status?: string }).status;
        if (status !== "success") {
          throw new Error(`Workflow ${String(id)} failed`);
        }
        return (result as { result?: unknown }).result as z.infer<
          OutputSchemaOf<typeof wf>
        >;
      } catch (error) {
        console.error(`Workflow ${String(id)} failed`, error);
        throw error;
      }
    }) as WrappedWorkflows<M>[keyof WrappedWorkflows<M> & string]);
  }

  const agents = instance.getAgents() as Record<
    string,
    { generate: (content: string) => Promise<{ text?: unknown }> }
  >;
  for (const id of Object.keys(agents) as (keyof AgentsOf<M> & string)[]) {
    const agent = agents[id] as unknown as {
      generate: (content: string) => Promise<{ text?: unknown }>;
    };
    const wrapper = gensx.Workflow(
      id,
      async ({ content }: { content: string }): Promise<string> => {
        try {
          const response = await agent.generate(content);
          const text = (response as { text?: unknown }).text;
          return typeof text === "string" ? text : String(text);
        } catch (error) {
          console.error(`Agent ${String(id)} failed`, error);
          throw error;
        }
      },
    );
    wrapped[id] = wrapper as WrappedAgents<M>[keyof WrappedAgents<M> & string];
  }

  return wrapped as WrappedWorkflows<M> & WrappedAgents<M>;
}
