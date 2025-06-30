import { ulid } from "ulidx";

/**
 * Generate a deterministic ID for a workflow
 */
export function generateWorkflowId(name: string): string {
  const prefix = "01";
  const encoded = Buffer.from(name)
    .toString("base64")
    .replace(/[+/=]/g, "")
    .toUpperCase()
    .substring(0, 22);

  return `${prefix}${encoded}`;
}

/**
 * Generate a unique execution ID
 */
export function generateExecutionId(): string {
  return ulid();
}
