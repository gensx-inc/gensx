import { createWorkflow } from "@/src/utils/workflowBuilder";

import { LLMEditor } from "../shared/components/LLMEditor";
import { LLMWriter } from "../shared/components/LLMWriter";

interface TweetWritingWorkflowInputs {
  content: string | Promise<string>;
}

export const TweetWritingWorkflow = createWorkflow<
  TweetWritingWorkflowInputs,
  string
>(async (props, { resolve, execute }) => {
  return (
    <LLMWriter content={props.content}>
      {({ content }) => (
        <LLMEditor content={content}>
          {editedContent => resolve(editedContent)}
        </LLMEditor>
      )}
    </LLMWriter>
  );
});
