import { WorkflowInfo } from "./types.js";

/**
 * Generate OpenAPI specification dynamically based on server configuration
 */
export function generateOpenApiSpec(
  workflows: WorkflowInfo[],
  hostname: string,
  port: number,
): Record<string, unknown> {
  return {
    openapi: "3.0.0",
    info: {
      title: "GenSX API",
      version: "1.0.0",
      description: "API documentation for GenSX workflows",
    },
    servers: [
      {
        url: `http://${hostname}:${port}`,
        description: "Development Server",
      },
    ],
    tags: [
      {
        name: "Workflows",
        description: "List and manage workflows",
      },
      ...workflows.map((workflow) => ({
        name: workflow.name,
        description: `Operations for ${workflow.name} workflow`,
      })),
    ],
    paths: {
      "/workflows": {
        get: {
          tags: ["Workflows"],
          summary: "List all workflows",
          responses: {
            "200": {
              description: "List of available workflows",
              content: {
                "application/json": {
                  example: {
                    workflows,
                  },
                },
              },
            },
          },
        },
      },
      "/workflowExecutions/{executionId}/progress": {
        get: {
          tags: ["Workflows"],
          summary: "Get progress events for a workflow execution",
          parameters: [
            {
              name: "executionId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "ID of the workflow execution",
            },
            {
              name: "lastEventId",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Filter events after this ID",
            },
          ],
          responses: {
            "200": {
              description: "Progress events in SSE or NDJSON format",
              content: {
                "text/event-stream": {
                  schema: {
                    type: "string",
                    example:
                      'id: 1\ndata: {"type":"start","workflowName":"testWorkflow"}\n\n',
                  },
                },
                "application/x-ndjson": {
                  schema: {
                    type: "string",
                    example:
                      '{"id":"1","type":"start","workflowName":"testWorkflow"}\n',
                  },
                },
              },
              headers: {
                "Last-Event-Id": {
                  schema: {
                    type: "string",
                  },
                  description: "ID of the last event sent",
                },
              },
            },
            "404": {
              description: "Execution not found",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      ...Object.fromEntries(
        workflows.map((workflow) => [
          `/workflows/${workflow.name}`,
          {
            get: {
              tags: [workflow.name],
              summary: `Get ${workflow.name} workflow details`,
              responses: {
                "200": {
                  description: "Workflow details",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          inputSchema: { type: "object" },
                          outputSchema: { type: "object" },
                          createdAt: {
                            type: "string",
                            format: "date-time",
                          },
                          updatedAt: {
                            type: "string",
                            format: "date-time",
                          },
                          url: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            post: {
              tags: [workflow.name],
              summary: `Execute ${workflow.name} workflow`,
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: workflow.inputSchema ?? {
                      type: "object",
                      properties: {},
                    },
                  },
                },
              },
              responses: {
                "200": {
                  description: "Successful execution",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          executionId: { type: "string" },
                          executionStatus: {
                            type: "string",
                            enum: ["completed", "queued", "running", "failed"],
                          },
                          output: workflow.outputSchema ?? {
                            type: "object",
                            properties: {},
                          },
                        },
                      },
                    },
                    "text/event-stream": {
                      schema: {
                        type: "string",
                        description:
                          "Server-Sent Events (SSE) stream of progress events",
                        example:
                          'id: 1\ndata: {"type":"start","workflowName":"testWorkflow"}\n\nid: 2\ndata: {"type":"progress","data":"Processing..."}\n\n',
                      },
                    },
                    "application/x-ndjson": {
                      schema: {
                        type: "string",
                        description:
                          "Newline-delimited JSON stream of progress events",
                        example:
                          '{"id":"1","type":"start","workflowName":"testWorkflow"}\n{"id":"2","type":"progress","data":"Processing..."}\n',
                      },
                    },
                    "application/stream": {
                      schema: {
                        type: "string",
                        description:
                          "Streaming response for workflows that returns streaming output",
                      },
                    },
                  },
                  headers: {
                    "Content-Type": {
                      schema: {
                        type: "string",
                        enum: [
                          "application/json",
                          "text/event-stream",
                          "application/x-ndjson",
                          "application/stream",
                        ],
                      },
                      description: "Response format based on Accept header",
                    },
                    "Transfer-Encoding": {
                      schema: {
                        type: "string",
                        enum: ["chunked"],
                      },
                      description: "Present for streaming responses",
                    },
                  },
                },
                "400": {
                  description: "Bad request",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          error: { type: "string" },
                        },
                      },
                    },
                  },
                },
                "422": {
                  description: "Workflow execution failed",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          executionId: { type: "string" },
                          executionStatus: {
                            type: "string",
                            enum: ["failed"],
                          },
                          error: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ]),
      ),
      ...Object.fromEntries(
        workflows.map((workflow) => [
          `/workflows/${workflow.name}/start`,
          {
            post: {
              tags: [workflow.name],
              summary: `Start ${workflow.name} workflow asynchronously`,
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: workflow.inputSchema ?? {
                      type: "object",
                      properties: {},
                    },
                  },
                },
              },
              responses: {
                "202": {
                  description: "Workflow started",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          executionId: { type: "string" },
                          executionStatus: {
                            type: "string",
                            enum: ["queued"],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ]),
      ),
      ...Object.fromEntries(
        workflows.map((workflow) => [
          `/workflows/${workflow.name}/executions/{executionId}`,
          {
            get: {
              tags: [workflow.name],
              summary: `Get execution status for ${workflow.name} workflow`,
              parameters: [
                {
                  name: "executionId",
                  in: "path",
                  required: true,
                  schema: { type: "string" },
                },
              ],
              responses: {
                "200": {
                  description: "Execution status",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          executionStatus: {
                            type: "string",
                            enum: [
                              "queued",
                              "starting",
                              "running",
                              "completed",
                              "failed",
                            ],
                          },
                          createdAt: {
                            type: "string",
                            format: "date-time",
                          },
                          finishedAt: {
                            type: "string",
                            format: "date-time",
                          },
                          output: workflow.outputSchema ?? {},
                          error: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ]),
      ),
      ...Object.fromEntries(
        workflows.map((workflow) => [
          `/workflows/${workflow.name}/executions`,
          {
            get: {
              tags: [workflow.name],
              summary: `List executions for ${workflow.name} workflow`,
              responses: {
                "200": {
                  description: "List of workflow executions",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          executions: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                id: { type: "string" },
                                executionStatus: {
                                  type: "string",
                                  enum: [
                                    "queued",
                                    "starting",
                                    "running",
                                    "completed",
                                    "failed",
                                  ],
                                },
                                createdAt: {
                                  type: "string",
                                  format: "date-time",
                                },
                                finishedAt: {
                                  type: "string",
                                  format: "date-time",
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ]),
      ),
    },
  };
}

/**
 * Generate Swagger UI HTML
 */
export function generateSwaggerUI(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>GenSX API</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@latest/swagger-ui.css" />
      <style>
        body {
          margin: 0;
          padding: 0;
        }
        #swagger-ui {
          max-width: 1460px;
          margin: 0 auto;
          padding: 20px;
        }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@latest/swagger-ui-bundle.js"></script>
      <script>
        window.onload = () => {
          window.ui = SwaggerUIBundle({
            url: '/openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIBundle.SwaggerUIStandalonePreset
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "BaseLayout",
            displayRequestDuration: true,
            docExpansion: 'list',
            filter: true,
            tryItOutEnabled: true
          });
        };
      </script>
    </body>
    </html>
    `;
}
