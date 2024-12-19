import { createWorkflow } from "@/src/utils/workflowBuilder";

interface EditorProps {
  content: string;
}

export const LLMEditor = createWorkflow<EditorProps, string>(
  async (props, { resolve }) => {
    const editedContent = await Promise.resolve(`Edited: ${props.content}`);
    return resolve(editedContent);
  },
  "LLMEditor",
);
