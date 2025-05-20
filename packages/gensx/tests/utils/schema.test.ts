import { unlinkSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { generateSchema } from "../../src/utils/schema.js";

describe("schema generator", () => {
  // Helper to create a temporary TypeScript file for testing
  async function createTempFile(content: string): Promise<string> {
    const tempFile = resolve(
      os.tmpdir(),
      `gensx-${Math.random().toString(36).substring(2, 15)}.ts`,
    );
    await fs.writeFile(tempFile, content);
    return tempFile;
  }

  // Helper to clean up temporary files
  function cleanupTempFile(file: string) {
    unlinkSync(file);
  }

  async function verifySchemas(
    fileContent: string,
    validator: (parsedSchema: Record<string, unknown>) => void,
  ) {
    const tempFile = await createTempFile(fileContent);

    try {
      const schemas = generateSchema(tempFile);
      validator(schemas);
    } finally {
      cleanupTempFile(tempFile);
    }
  }

  it("should extract schema from a workflow with decorator", async () => {
    const content = `
      import { Workflow } from "@gensx/core";

      interface TestProps {
        input: string;
        count: number;
      }

      interface TestOutput {
        result: string;
        processed: boolean;
      }

      @Workflow()
      export async function TestWorkflow(props: TestProps): Promise<TestOutput> {
        return {
          result: props.input,
          processed: true
        };
      }
    `;

    const expectedSchemas = {
      TestWorkflow: {
        input: {
          type: "object",
          properties: {
            input: { type: "string" },
            count: { type: "number" },
          },
          required: ["input", "count"].sort(),
        },
        output: {
          type: "object",
          properties: {
            result: { type: "string" },
            processed: { type: "boolean" },
          },
          required: ["result", "processed"].sort(),
        },
      },
    };

    await verifySchemas(content, (schemas) => {
      expect(schemas).toMatchObject(expectedSchemas);
    });
  });

  it("should handle Promise return types", async () => {
    const content = `
      import { Workflow } from "@gensx/core";

      interface PromiseProps {
        value: number;
      }

      @Workflow()
      export async function PromiseWorkflow(props: PromiseProps): Promise<number> {
        return props.value;
      }
    `;

    const expectedSchemas = {
      PromiseWorkflow: {
        input: {
          type: "object",
          properties: {
            value: { type: "number" },
          },
          required: ["value"],
        },
        output: {
          type: "number",
        },
      },
    };

    await verifySchemas(content, (schemas) => {
      expect(schemas).toMatchObject(expectedSchemas);
    });
  });

  it("should handle nested object types", async () => {
    const content = `
      import { Workflow } from "@gensx/core";

      interface NestedProps {
        data: {
          items: Array<{
            id: string;
            value: number;
          }>;
          metadata?: {
            count: number;
          };
        };
      }

      @Workflow()
      export async function NestedWorkflow(props: NestedProps): Promise<{ processed: boolean }> {
        return { processed: true };
      }
    `;

    const expectedSchemas = {
      NestedWorkflow: {
        input: {
          type: "object",
          properties: {
            data: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      value: { type: "number" },
                    },
                    required: ["id", "value"],
                  },
                },
                metadata: {
                  type: "object",
                  properties: {
                    count: { type: "number" },
                  },
                  required: ["count"],
                },
              },
              required: ["items"],
            },
          },
          required: ["data"],
        },
        output: {
          type: "object",
          properties: {
            processed: { type: "boolean" },
          },
          required: ["processed"],
        },
      },
    };

    await verifySchemas(content, (schemas) => {
      expect(schemas).toMatchObject(expectedSchemas);
    });
  });

  it("should handle exported workflows only", async () => {
    const content = `
      import { Workflow } from "@gensx/core";

      interface Props {
        value: string;
      }

      @Workflow()
      async function InternalWorkflow(props: Props): Promise<string> {
        return props.value;
      }

      @Workflow()
      export async function ExportedWorkflow(props: Props): Promise<string> {
        return props.value;
      }
    `;

    await verifySchemas(content, (schemas) => {
      expect(schemas.ExportedWorkflow).toBeDefined();
      expect(schemas.InternalWorkflow).toBeUndefined();
    });
  });

  it("should handle multiple workflows in the same file", async () => {
    const content = `
      import { Workflow } from "@gensx/core";

      interface Props {
        value: string;
      }

      @Workflow()
      export async function Workflow1(props: Props): Promise<string> {
        return props.value;
      }

      @Workflow()
      export async function Workflow2(props: Props): Promise<string> {
        return props.value;
      }
    `;

    await verifySchemas(content, (schemas) => {
      expect(schemas).toHaveProperty("Workflow1");
      expect(schemas).toHaveProperty("Workflow2");
      expect(Object.keys(schemas)).toHaveLength(2);
    });
  });

  it("should handle inferred types", async () => {
    const content = `
      import { Workflow } from "@gensx/core";

      @Workflow()
      export async function InferredWorkflow(props: { value: string }) {
        return props.value;
      }
    `;

    await verifySchemas(content, (schemas) => {
      expect(schemas).toHaveProperty("InferredWorkflow");
      expect(schemas.InferredWorkflow).toEqual({
        input: {
          type: "object",
          properties: {
            value: { type: "string" },
          },
          required: ["value"],
        },
        output: {
          type: "string",
        },
      });
    });
  });

  it("should handle export objects", async () => {
    const content = `
      import { Workflow } from "@gensx/core";

      @Workflow()
      async function ExportedWorkflow(props: { value: string }) {
        return props.value;
      }

      export { ExportedWorkflow };
    `;

    await verifySchemas(content, (schemas) => {
      expect(schemas).toHaveProperty("ExportedWorkflow");
      expect(schemas.ExportedWorkflow).toEqual({
        input: {
          type: "object",
          properties: {
            value: { type: "string" },
          },
          required: ["value"],
        },
        output: {
          type: "string",
        },
      });
    });
  });

  it("should handle streaming workflows", async () => {
    const content = `
      import { Workflow } from "@gensx/core";

      interface StreamProps {
        query: string;
      }

      interface StreamChunk {
        content: string;
        role: string;
      }

      @Workflow()
      export async function StringStreamWorkflow(props: StreamProps): Promise<AsyncIterable<string>> {
        return {
          [Symbol.asyncIterator]: async function* () {
            yield "chunk1";
            yield "chunk2";
          }
        };
      }

      @Workflow()
      export async function ObjectStreamWorkflow(props: StreamProps): Promise<AsyncIterable<StreamChunk>> {
        return {
          [Symbol.asyncIterator]: async function* () {
            yield { content: "chunk1", role: "assistant" };
            yield { content: "chunk2", role: "assistant" };
          }
        };
      }
    `;

    await verifySchemas(content, (schemas) => {
      // Test string stream
      expect(schemas).toHaveProperty("StringStreamWorkflow");
      expect(schemas.StringStreamWorkflow).toEqual({
        input: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
          required: ["query"],
        },
        output: {
          type: "object",
          properties: {
            type: { const: "stream" },
            value: { type: "string" },
          },
          required: ["type", "value"],
        },
      });

      // Test object stream
      expect(schemas).toHaveProperty("ObjectStreamWorkflow");
      expect(schemas.ObjectStreamWorkflow).toEqual({
        input: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
          required: ["query"],
        },
        output: {
          type: "object",
          properties: {
            type: { const: "stream" },
            value: {
              type: "object",
              properties: {
                content: { type: "string" },
                role: { type: "string" },
              },
              required: ["content", "role"],
            },
          },
          required: ["type", "value"],
        },
      });
    });
  });
});
