import { createWorkflow } from "@/src/utils/workflowBuilder";

import { LLMEditor } from "../shared/components/LLMEditor";
import { LLMResearcher } from "../shared/components/LLMResearcher";
import { LLMWriter } from "../shared/components/LLMWriter";

interface BlogWritingWorkflowInputs {
  title: string;
  prompt: string;
}

export const BlogWritingWorkflow = createWorkflow<
  BlogWritingWorkflowInputs,
  string
>((props, { resolve }) => (
  <LLMResearcher title={props.title} prompt={props.prompt}>
    {({ research }) => (
      <LLMWriter content={research}>
        {({ content }) => (
          <LLMEditor content={content}>
            {editedContent => resolve(editedContent)}
          </LLMEditor>
        )}
      </LLMWriter>
    )}
  </LLMResearcher>
));
