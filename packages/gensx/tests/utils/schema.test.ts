/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { readdirSync, rmdirSync, unlinkSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path, { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { generateSchema } from "../../src/utils/schema.js";

describe("schema generator", () => {
  // Helper to create a temporary TypeScript file for testing
  async function createTempFile(content: string): Promise<[string, string]> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "schema-test-"));
    const tempFile = resolve(tempDir, `workflows.ts`);
    await fs.writeFile(tempFile, content);

    return [tempFile, tempDir];
  }

  // Helper to clean up temporary files
  function cleanupTempFiles(dir: string) {
    const files = readdirSync(dir);
    files.forEach((file) => {
      unlinkSync(resolve(dir, file));
    });
    rmdirSync(dir);
  }

  async function verifySchemas(
    fileContent: string,
    validator: (parsedSchema: Record<string, unknown>) => void,
  ) {
    const [tempFile, tempDir] = await createTempFile(fileContent);
    // Create a tsconfig.json file in the temp directory
    await fs.writeFile(
      resolve(tempDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ESNext",
          module: "NodeNext",
          lib: ["ESNext", "DOM"],
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          moduleResolution: "NodeNext",
          resolveJsonModule: true,
          isolatedModules: true,
          outDir: "./dist",
        },
      }),
    );

    try {
      const schemas = generateSchema(
        tempFile,
        resolve(tempDir, "tsconfig.json"),
      );
      validator(schemas);
    } finally {
      cleanupTempFiles(tempDir);
    }
  }

  it("should extract schema from a workflow with decorator", async () => {
    const content = `
      import * as gensx from "@gensx/core";

      interface TestProps {
        input: string;
        count: number;
      }

      interface TestOutput {
        result: string;
        processed: boolean;
      }

      export const TestWorkflow = gensx.Workflow("TestWorkflow", async (props: TestProps) => {
        return {
          result: props.input,
          processed: true
        };
      });
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
      import * as gensx from "@gensx/core";

      interface PromiseProps {
        value: number;
      }

      export const PromiseWorkflow = gensx.Workflow("PromiseWorkflow", async (props: PromiseProps) => {
        return props.value;
      });
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
      import * as gensx from "@gensx/core";

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

      export const NestedWorkflow = gensx.Workflow("NestedWorkflow", async (props: NestedProps) => {
        return { processed: true };
      });
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
      import * as gensx from "@gensx/core";

      interface Props {
        value: string;
      }

      const InternalWorkflow = gensx.Workflow("InternalWorkflow", async (props: Props) => {
        return props.value;
      });

      const ExportedWorkflow = gensx.Workflow("ExportedWorkflow", async (props: Props) => {
        return props.value;
      });

      export { ExportedWorkflow };
    `;

    await verifySchemas(content, (schemas) => {
      expect(schemas.ExportedWorkflow).toBeDefined();
      expect(schemas.InternalWorkflow).toBeUndefined();
    });
  });

  it("should handle multiple workflows in the same file", async () => {
    const content = `
      import * as gensx from "@gensx/core";

      interface Props {
        value: string;
      }

      const Workflow1 = gensx.Workflow("Workflow1", async (props: Props) => {
        return props.value;
      });

      const Workflow2 = gensx.Workflow("Workflow2", async (props: Props) => {
        return props.value;
      });

      export { Workflow1, Workflow2 };
    `;

    await verifySchemas(content, (schemas) => {
      expect(schemas).toHaveProperty("Workflow1");
      expect(schemas).toHaveProperty("Workflow2");
      expect(Object.keys(schemas)).toHaveLength(2);
    });
  });

  it("should handle inferred types", async () => {
    const content = `
      import * as gensx from "@gensx/core";

      export const InferredWorkflow = gensx.Workflow("InferredWorkflow", async (props: { value: string }) => {
        return props.value;
      });
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
      import * as gensx from "@gensx/core";

      const ExportedWorkflow = gensx.Workflow("ExportedWorkflow", async (props: { value: string }) => {
        return props.value;
      });

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
      import * as gensx from "@gensx/core";

      interface StreamProps {
        query: string;
      }

      interface StreamChunk {
        content: string;
        role: string;
      }

      export const StringStreamWorkflow = gensx.Workflow("StringStreamWorkflow", async (props: StreamProps) => {
        return {
          [Symbol.asyncIterator]: async function* () {
            yield "chunk1";
            yield "chunk2";
          }
        };
      });

      export const ObjectStreamWorkflow = gensx.Workflow("ObjectStreamWorkflow", async (props: StreamProps) => {
        return {
          [Symbol.asyncIterator]: async function* () {
            yield { content: "chunk1", role: "assistant" };
            yield { content: "chunk2", role: "assistant" };
          }
        };
      });

      export const GeneratorWorkflow = gensx.Workflow("GeneratorWorkflow", async (props: StreamProps) => {
        return (async function* () {
          yield "chunk1";
          yield "chunk2";
        })();
      });

      export const ObjectGeneratorWorkflow = gensx.Workflow("ObjectGeneratorWorkflow", async (props: StreamProps) => {
        return (async function* () {
          yield { content: "chunk1", role: "assistant" };
          yield { content: "chunk2", role: "assistant" };
        })();
      });
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

      // Test string generator
      expect(schemas).toHaveProperty("GeneratorWorkflow");
      expect(schemas.GeneratorWorkflow).toEqual({
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

      // Test object generator
      expect(schemas).toHaveProperty("ObjectGeneratorWorkflow");
      expect(schemas.ObjectGeneratorWorkflow).toEqual({
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

  it("should handle workflows with no parameters", async () => {
    const content = `
      import * as gensx from "@gensx/core";

      export const NoParamsWorkflow = gensx.Workflow("NoParamsWorkflow", async () => {
        return { message: "Hello, World!" };
      });
    `;

    await verifySchemas(content, (schemas) => {
      expect(schemas).toHaveProperty("NoParamsWorkflow");
      expect(schemas.NoParamsWorkflow).toEqual({
        input: {
          type: "object",
          additionalProperties: true,
        },
        output: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
          required: ["message"],
        },
      });
    });
  });

  it("should handle workflows with only optional parameters", async () => {
    const content = `
      import * as gensx from "@gensx/core";

      interface OptionalProps {
        name?: string;
        age?: number;
        isActive?: boolean;
      }

      export const OptionalPropsWorkflow = gensx.Workflow("OptionalPropsWorkflow", async (props: OptionalProps) => {
        return { processed: true };
      });
    `;

    await verifySchemas(content, (schemas) => {
      expect(schemas).toHaveProperty("OptionalPropsWorkflow");
      const workflow = (schemas as any).OptionalPropsWorkflow;
      expect(workflow.input.type).toBe("object");
      expect(workflow.input.properties).toHaveProperty("name");
      expect(workflow.input.properties).toHaveProperty("age");
      expect(workflow.input.properties).toHaveProperty("isActive");
      // For optional parameters, required should be undefined or empty
      expect(workflow.input.required).toBeUndefined();
    });
  });

  it("should handle workflows with void return type", async () => {
    const content = `
      import * as gensx from "@gensx/core";

      export const VoidWorkflow = gensx.Workflow("VoidWorkflow", async (props: { input: string }) => {
        console.log(props.input);
      });
    `;

    await verifySchemas(content, (schemas) => {
      expect(schemas).toHaveProperty("VoidWorkflow");
      const workflow = (schemas as any).VoidWorkflow;
      expect(workflow.input).toEqual({
        type: "object",
        properties: {
          input: { type: "string" },
        },
        required: ["input"],
      });
      // Void type should be handled gracefully
      expect(workflow.output.type).toBe("object");
      expect(workflow.output.additionalProperties).toBe(true);
    });
  });

  it("should handle workflows with array inputs and outputs", async () => {
    const content = `
      import * as gensx from "@gensx/core";

      interface ArrayProps {
        items: string[];
        numbers: Array<number>;
        objects: Array<{ id: string; value: number }>;
      }

      export const ArrayWorkflow = gensx.Workflow("ArrayWorkflow", async (props: ArrayProps) => {
        return {
          processedItems: props.items.map(item => item.toUpperCase()),
          sum: props.numbers.reduce((a, b) => a + b, 0),
          objectIds: props.objects.map(obj => obj.id)
        };
      });
    `;

    await verifySchemas(content, (schemas) => {
      expect(schemas).toHaveProperty("ArrayWorkflow");
      expect(schemas.ArrayWorkflow).toEqual({
        input: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: { type: "string" },
            },
            numbers: {
              type: "array",
              items: { type: "number" },
            },
            objects: {
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
          },
          required: ["items", "numbers", "objects"],
        },
        output: {
          type: "object",
          properties: {
            processedItems: {
              type: "array",
              items: { type: "string" },
            },
            sum: { type: "number" },
            objectIds: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["objectIds", "processedItems", "sum"],
        },
      });
    });
  });

  it("should handle workflows with union types", async () => {
    const content = `
      import * as gensx from "@gensx/core";

      interface UnionProps {
        value: string | number;
        status: "pending" | "completed" | "failed";
        optional?: string | null;
      }

      export const UnionWorkflow = gensx.Workflow("UnionWorkflow", async (props: UnionProps) => {
        return {
          result: typeof props.value === "string" ? props.value : props.value.toString(),
          isComplete: props.status === "completed"
        };
      });
    `;

    await verifySchemas(content, (schemas) => {
      expect(schemas).toHaveProperty("UnionWorkflow");
      const workflow = (schemas as any).UnionWorkflow;
      expect(workflow.input.type).toBe("object");
      expect(workflow.input.properties).toHaveProperty("value");
      expect(workflow.input.properties).toHaveProperty("status");
      expect(workflow.input.properties).toHaveProperty("optional");

      // Check that union types are handled (exact structure may vary)
      expect(workflow.input.properties.value).toHaveProperty("oneOf");
      expect(workflow.input.required).toContain("value");
      expect(workflow.input.required).toContain("status");
      expect(workflow.input.required).not.toContain("optional");
    });
  });

  it("should handle deeply nested object structures", async () => {
    const content = `
      import * as gensx from "@gensx/core";

      interface DeepProps {
        user: {
          profile: {
            personal: {
              name: string;
              contacts: {
                email: string;
                phones: Array<{
                  type: "mobile" | "home" | "work";
                  number: string;
                  isPrimary?: boolean;
                }>;
              };
            };
            preferences: {
              theme: "light" | "dark";
              notifications: {
                email: boolean;
                push: boolean;
                sms?: boolean;
              };
            };
          };
        };
      }

      export const DeepNestedWorkflow = gensx.Workflow("DeepNestedWorkflow", async (props: DeepProps) => {
        return {
          userName: props.user.profile.personal.name,
          primaryPhone: props.user.profile.personal.contacts.phones.find(p => p.isPrimary)?.number,
          isEmailEnabled: props.user.profile.preferences.notifications.email
        };
      });
    `;

    await verifySchemas(content, (schemas) => {
      expect(schemas).toHaveProperty("DeepNestedWorkflow");
      // Just verify the structure exists and has the right nested properties
      const workflowSchema = (schemas as any).DeepNestedWorkflow;
      expect(workflowSchema.input.type).toBe("object");
      expect(workflowSchema.input.properties).toHaveProperty("user");
      expect(workflowSchema.input.properties.user.properties).toHaveProperty(
        "profile",
      );
      expect(
        workflowSchema.input.properties.user.properties.profile.properties,
      ).toHaveProperty("personal");
      expect(
        workflowSchema.input.properties.user.properties.profile.properties,
      ).toHaveProperty("preferences");
    });
  });

  it("should handle workflows with mixed export patterns", async () => {
    const content = `
      import * as gensx from "@gensx/core";

      // Not exported - should not appear in schemas
      const InternalWorkflow1 = gensx.Workflow("InternalWorkflow1", async (props: { value: string }) => {
        return props.value;
      });

      // Exported directly - should appear
      export const DirectExportWorkflow = gensx.Workflow("DirectExportWorkflow", async (props: { value: number }) => {
        return props.value * 2;
      });

      // Exported via export statement - should appear
      const NamedExportWorkflow = gensx.Workflow("NamedExportWorkflow", async (props: { value: boolean }) => {
        return !props.value;
      });

      // Another internal workflow - should not appear
      const InternalWorkflow2 = gensx.Workflow("InternalWorkflow2", async (props: { data: any }) => {
        return { processed: true };
      });

      export { NamedExportWorkflow };
    `;

    await verifySchemas(content, (schemas) => {
      // Should only have the two exported workflows
      expect(Object.keys(schemas)).toHaveLength(2);
      expect(schemas).toHaveProperty("DirectExportWorkflow");
      expect(schemas).toHaveProperty("NamedExportWorkflow");
      expect(schemas).not.toHaveProperty("InternalWorkflow1");
      expect(schemas).not.toHaveProperty("InternalWorkflow2");
    });
  });

  it("should handle different import patterns for Workflow", async () => {
    const content = `
      import { Workflow } from "@gensx/core";
      import { Workflow as W } from "@gensx/core";
      import * as gensx from "@gensx/core";

      // Using direct import
      export const DirectImportWorkflow = Workflow("DirectImportWorkflow", async (props: { value: string }) => {
        return props.value;
      });

      // Using aliased import
      export const AliasedImportWorkflow = W("AliasedImportWorkflow", async (props: { value: number }) => {
        return props.value * 2;
      });

      // Using namespace import
      export const NamespaceImportWorkflow = gensx.Workflow("NamespaceImportWorkflow", async (props: { value: boolean }) => {
        return !props.value;
      });
    `;

    await verifySchemas(content, (schemas) => {
      // Should have all three workflows
      expect(Object.keys(schemas)).toHaveLength(3);
      expect(schemas).toHaveProperty("DirectImportWorkflow");
      expect(schemas).toHaveProperty("AliasedImportWorkflow");
      expect(schemas).toHaveProperty("NamespaceImportWorkflow");

      // Verify they all have correct schemas
      expect(
        (schemas as any).DirectImportWorkflow.input.properties,
      ).toHaveProperty("value");
      expect(
        (schemas as any).AliasedImportWorkflow.input.properties,
      ).toHaveProperty("value");
      expect(
        (schemas as any).NamespaceImportWorkflow.input.properties,
      ).toHaveProperty("value");
    });
  });
});
