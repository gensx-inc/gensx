import { ulid } from "ulidx";

/**
 * Generate a deterministic ID for a workflow
 */
export function generateWorkflowId(name: string): string {
  const prefix = "01";
  const encoded = Buffer.from(name)
    .toString("base64")
    .replace(/[+/=]/g, "")
    .substring(0, 22);

  return `${prefix}${encoded}`;
}

/**
 * Generate a unique execution ID
 */
export function generateExecutionId(): string {
  return ulid();
}

/**
 * Create a local scoped token that encodes the execution scope in base64 with a
 * `gensx_lst_` prefix.
 */
export function encodeLocalScopedToken(executionScope: Record<string, unknown>): string {
  const scopeJson = JSON.stringify(executionScope);
  const encoded = Buffer.from(scopeJson, "utf8").toString("base64");
  return `gensx_lst_${encoded}`;
}

/**
 * Decode a local scoped token back into an execution scope object. Returns
 * undefined if the token is not a local scoped token or cannot be decoded.
 */
export function decodeLocalScopedToken(token: string | undefined): Record<string, unknown> | undefined {
  try {
    if (!token?.startsWith("gensx_lst_")) {
      return undefined;
    }
    const encoded = token.slice("gensx_lst_".length);
    const json = Buffer.from(encoded, "base64").toString("utf8");
    const parsed = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}
