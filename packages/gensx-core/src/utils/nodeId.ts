import { createHash } from "node:crypto";

import { deterministicString } from "deterministic-object-hash";
import { ZodObject } from "zod/v4";

import { ContentId, NodeId, PathId } from "../checkpoint-types.js";

export function generateNodeId(
  componentName: string,
  props: Record<string, unknown>,
  idPropsKeys: string[] | undefined,
  parentPath = "",
  callIndex = 0,
): NodeId {
  // Generate hierarchical path
  const pathId: PathId =
    parentPath && parentPath.length > 0
      ? `${parentPath}-${componentName}`
      : componentName;

  const propsStr = stringifyProps(props, idPropsKeys);
  // Generate content hash from component name + props
  const contentId: ContentId = createHash("sha1")
    .update(componentName)
    .update(propsStr)
    .digest("hex")
    .slice(0, 8);

  // Create primary ID: path:contentHash:callIndex
  const nodeId: NodeId = `${pathId}:${contentId}:${callIndex}`;

  return nodeId;
}

export function stringifyProps(
  props: Record<string, unknown> | undefined | null,
  idPropsKeys?: string[],
): string {
  if (!props) {
    if (idPropsKeys?.length) {
      console.warn(
        `[Checkpoint] No props provided for node id generation, but idPropsKeys are provided.`,
      );
    }
    return `${props}`;
  }
  return deterministicString(
    deterministicProps(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      JSON.parse(JSON.stringify(props)),
      idPropsKeys,
    ),
  );
}

function deterministicProps(
  props: Record<string, unknown>,
  idPropsKeys: string[] | undefined,
  path = "",
): Record<string, unknown> {
  const filteredProps: Record<string, unknown> = !idPropsKeys
    ? props
    : filterProps(props, idPropsKeys);
  // Do some processing on certain types of props that are hard to serialize like zod schemas
  for (const key in filteredProps) {
    const value = filteredProps[key];
    if (value instanceof ZodObject) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      filteredProps[key] = value.toString();
    } else if (typeof value === "function") {
      console.warn(
        `[Checkpoint] Function prop found in ${path}.${key}, this is not serializable and cannot be used for node id generation.`,
        {
          path: `${path}.${key}`,
          value,
        },
      );
      filteredProps[key] = "[Function]";
    } else if (typeof value === "object" && value !== null) {
      filteredProps[key] = deterministicProps(
        value as Record<string, unknown>,
        undefined,
        `${path}.${key}`,
      );
    }
  }
  return filteredProps;
}

/**
 * Filter the props to only include the keys in idPropsKeys
 * @param props - The props to filter
 * @param idPropsKeys - A list of paths to values in the props to include in the id.
 * @returns The filtered props
 */
function filterProps(
  props: Record<string, unknown>,
  idPropsKeys: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const path of idPropsKeys) {
    const parts = path.split(".");
    let current: Record<string, unknown> | undefined = props;
    let target = result;

    // Traverse the path
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      current = current[part] as Record<string, unknown> | undefined;
      if (!current) break;

      target[part] ??= {};
      target = target[part] as Record<string, unknown>;
    }

    // Set the final value
    const lastPart = parts[parts.length - 1];
    if (current && lastPart in current) {
      const value = current[lastPart];
      // If the value is not a primitive, copy the whole thing
      if (
        value &&
        typeof value !== "string" &&
        typeof value !== "number" &&
        typeof value !== "boolean" &&
        typeof value !== "bigint"
      ) {
        target[lastPart] = structuredClone(value);
      } else {
        target[lastPart] = value;
      }
    }
  }

  return result;
}
