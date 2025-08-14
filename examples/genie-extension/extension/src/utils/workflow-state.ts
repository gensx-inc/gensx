// Local implementation of applyObjectPatches to avoid Node.js dependencies
// Based on @gensx/core/workflow-state.ts

export interface StringAppendOperation {
  op: "string-append";
  path: string;
  value: string;
}

export interface JsonPatchOperation {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: any;
  from?: string;
}

export type Operation = JsonPatchOperation | StringAppendOperation;

/**
 * Apply JSON patches to reconstruct object state
 */
export function applyObjectPatches(
  patches: Operation[],
  currentState: any = {},
): any {
  let document = deepClone(currentState);

  for (const operation of patches) {
    if (operation.op === "string-append") {
      // Handle string append operation
      if (operation.path === "") {
        // Root-level string append
        if (typeof document === "string") {
          document = document + operation.value;
        } else {
          console.warn(
            `Cannot apply string-append: root value is not a string. Skipping operation.`,
          );
        }
        continue;
      }

      const pathParts = operation.path.split("/").slice(1); // Remove empty first element
      const target = getValueByPath(document, pathParts.slice(0, -1));
      const property = pathParts[pathParts.length - 1];

      if (typeof target === "object" && target !== null) {
        const currentValue = target[property];
        if (typeof currentValue === "string") {
          target[property] = currentValue + operation.value;
        } else {
          console.warn(
            `Cannot apply string-append: target path '${operation.path}' is not a string. Skipping operation.`,
          );
        }
      } else {
        console.warn(
          `Cannot apply string-append: target path '${operation.path}' does not exist or is not an object. Skipping operation.`,
        );
      }
    } else {
      // Handle standard JSON Patch operations
      document = applyStandardPatch(document, operation);
    }
  }

  return document;
}

function deepClone(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (Array.isArray(obj)) {
    return obj.map(deepClone);
  }

  const cloned: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

function getValueByPath(obj: any, path: string[]): any {
  let current = obj;
  for (const segment of path) {
    if (Array.isArray(current)) {
      const idx = Number(segment);
      if (!Number.isNaN(idx) && idx >= 0 && idx < current.length) {
        current = current[idx];
      } else {
        return undefined;
      }
    } else if (typeof current === "object" && current !== null) {
      if (segment in current) {
        current = current[segment];
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }
  return current;
}

function applyStandardPatch(document: any, operation: JsonPatchOperation): any {
  const pathParts =
    operation.path === "" ? [] : operation.path.split("/").slice(1);

  switch (operation.op) {
    case "add":
      return addOperation(document, pathParts, operation.value);
    case "replace":
      return replaceOperation(document, pathParts, operation.value);
    case "remove":
      return removeOperation(document, pathParts);
    default:
      console.warn(`Unsupported patch operation: ${operation.op}`);
      return document;
  }
}

function addOperation(document: any, pathParts: string[], value: any): any {
  if (pathParts.length === 0) {
    return value;
  }

  const cloned = deepClone(document);
  let current = cloned;

  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (Array.isArray(current)) {
      const idx = Number(part);
      current = current[idx];
    } else {
      current = current[part];
    }
  }

  const lastPart = pathParts[pathParts.length - 1];
  if (Array.isArray(current)) {
    const idx = Number(lastPart);
    if (idx === current.length) {
      current.push(value);
    } else {
      current.splice(idx, 0, value);
    }
  } else {
    current[lastPart] = value;
  }

  return cloned;
}

function replaceOperation(document: any, pathParts: string[], value: any): any {
  if (pathParts.length === 0) {
    return value;
  }

  const cloned = deepClone(document);
  let current = cloned;

  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (Array.isArray(current)) {
      const idx = Number(part);
      current = current[idx];
    } else {
      current = current[part];
    }
  }

  const lastPart = pathParts[pathParts.length - 1];
  if (Array.isArray(current)) {
    const idx = Number(lastPart);
    current[idx] = value;
  } else {
    current[lastPart] = value;
  }

  return cloned;
}

function removeOperation(document: any, pathParts: string[]): any {
  if (pathParts.length === 0) {
    return undefined;
  }

  const cloned = deepClone(document);
  let current = cloned;

  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (Array.isArray(current)) {
      const idx = Number(part);
      current = current[idx];
    } else {
      current = current[part];
    }
  }

  const lastPart = pathParts[pathParts.length - 1];
  if (Array.isArray(current)) {
    const idx = Number(lastPart);
    current.splice(idx, 1);
  } else {
    delete current[lastPart];
  }

  return cloned;
}
