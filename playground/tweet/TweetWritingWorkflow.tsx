import { createWorkflow } from "@/src/utils/workflowBuilder";

import { LLMEditor } from "../shared/components/LLMEditor";
import { LLMWriter } from "../shared/components/LLMWriter";
import { LLMResearcher } from "playground/shared/components/LLMResearcher";

interface TweetWritingWorkflowInputs {
  content: string | Promise<string>;
}

export const TweetWritingWorkflow = createWorkflow<
  TweetWritingWorkflowInputs,
  string
>(async (props, { resolve, execute }) => {
  try {
    const researchResult = await execute(
      <LLMResearcher title={"some title"} prompt={"some prompt"} />,
    );

    console.log("[TweetWorkflow] Got research result:", researchResult);

    return (
      <LLMWriter content={props.content}>
        {({ content }) => (
          <LLMEditor content={content}>
            {editedContent => resolve(editedContent)}
          </LLMEditor>
        )}
      </LLMWriter>
    );
  } catch (error) {
    console.error("[TweetWorkflow] Error in workflow:", error);
    throw error;
  }
}, "TweetWritingWorkflow");
