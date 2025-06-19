import { createWriteStream, WriteStream } from "node:fs";
import { writeFile } from "node:fs/promises";

import { Box, Static, Text, useApp } from "ink";
import React, { useCallback, useState } from "react";

import { EnvironmentResolver } from "../components/EnvironmentResolver.js";
import { ErrorMessage } from "../components/ErrorMessage.js";
import { FirstTimeSetup } from "../components/FirstTimeSetup.js";
import { LoadingSpinner } from "../components/LoadingSpinner.js";
import { useProjectName } from "../hooks/useProjectName.js";
import { getAuth } from "../utils/config.js";
import { USER_AGENT } from "../utils/user-agent.js";

// JSON-serializable value type for progress data
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// Individual message types
export interface WorkflowStartMessage {
  type: "start";
  workflowExecutionId?: string;
  workflowName: string;
}

export interface WorkflowComponentStartMessage {
  type: "component-start";
  componentName: string;
  label?: string;
  componentId: string;
}

export interface WorkflowComponentEndMessage {
  type: "component-end";
  componentName: string;
  label?: string;
  componentId: string;
}

export interface WorkflowDataMessage {
  type: "data";
  data: JsonValue;
}

export interface WorkflowEventMessage {
  type: "event";
  data: JsonValue;
  label: string;
}

export interface WorkflowObjectMessage {
  type: "object";
  data: JsonValue;
  label: string;
}

export interface WorkflowErrorMessage {
  type: "error";
  error: string;
}

export interface WorkflowEndMessage {
  type: "end";
}

export interface WorkflowOutputMessage {
  type: "output";
  content: string;
}

// Union of all message types
export type WorkflowMessage = { id: string } & (
  | WorkflowStartMessage
  | WorkflowComponentStartMessage
  | WorkflowComponentEndMessage
  | WorkflowDataMessage
  | WorkflowEventMessage
  | WorkflowObjectMessage
  | WorkflowErrorMessage
  | WorkflowEndMessage
  | WorkflowOutputMessage
);

export interface CliOptions {
  input: string;
  wait: boolean;
  project?: string;
  env?: string;
  output?: string;
  yes?: boolean;
  progress?: boolean;
}

interface Props {
  workflowName: string;
  options: CliOptions;
}

type Phase =
  | "resolveEnv"
  | "running"
  | "streaming"
  | "progress"
  | "done"
  | "error";

export const RunWorkflowUI: React.FC<Props> = ({ workflowName, options }) => {
  const { exit } = useApp();

  const [phase, setPhase] = useState<Phase>("resolveEnv");
  const [error, setError] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [streamContent, setStreamContent] = useState<string>("");
  const [progressContent, setProgressContent] = useState<WorkflowMessage[]>([]);
  const [workflowOutput, setWorkflowOutput] = useState<unknown>(null);
  const {
    loading,
    error: projectError,
    projectName,
    isFromConfig,
  } = useProjectName(options.project);

  if (options.output && !options.wait) {
    return (
      <ErrorMessage message="Output file cannot be specified without --wait." />
    );
  }

  const streamProgress = options.progress ?? false;

  const runWorkflow = useCallback(
    async (environment: string) => {
      try {
        setPhase("running");

        const auth = await getAuth();
        if (!auth) {
          throw new Error("Not authenticated. Please run 'gensx login' first.");
        }

        const inputJson = JSON.parse(options.input) as Record<string, unknown>;

        // Decide which endpoint to hit based on --wait flag
        const basePath = `/org/${auth.org}/projects/${encodeURIComponent(
          projectName!,
        )}/environments/${encodeURIComponent(environment)}/workflows/${encodeURIComponent(
          workflowName,
        )}`;

        const url = new URL(
          options.wait ? basePath : `${basePath}/start`,
          auth.apiBaseUrl,
        );

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
            "User-Agent": USER_AGENT,
            ...(streamProgress ? { Accept: "application/x-ndjson" } : {}),
          },
          body: JSON.stringify(inputJson),
        });

        if (response.status >= 400) {
          const errorBody = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            `Failed to start workflow (${response.status} ${response.statusText})\n\n${
              errorBody.error ?? ""
            }`,
          );
        }

        if (!options.wait) {
          const body = (await response.json()) as { executionId: string };
          setLogLines((ls) => [
            ...ls,
            `Workflow execution started with id: ${body.executionId}`,
          ]);
          setPhase("done");
          exit();
          return;
        }

        // Handle the JSON lines response
        if (streamProgress) {
          setPhase("progress");
          await handleJsonLinesStream(
            response.body,
            options.output,
            setProgressContent,
          );
          exit();
        } else {
          // WAIT=true path – handle streaming vs JSON response
          const isStream = response.headers
            .get("Content-Type")
            ?.includes("stream");

          if (isStream) {
            setPhase("streaming");
            await handleStream(response.body, options.output, setStreamContent);
            exit();
          } else {
            const body = (await response.json()) as {
              output: unknown;
              executionStatus: "success" | "failed";
            };

            if (body.executionStatus === "failed") {
              throw new Error("Workflow failed");
            }

            // Write or display output
            if (options.output) {
              await writeFile(
                options.output,
                JSON.stringify(body.output, null, 2),
              );
              setLogLines((ls) => [
                ...ls,
                `Workflow output written to ${options.output}`,
              ]);
            } else {
              setWorkflowOutput(body.output);
            }

            setPhase("done");
            setTimeout(() => {
              exit();
            }, 100);
          }
        }
      } catch (err) {
        setError((err as Error).message);
        setPhase("error");
        setTimeout(() => {
          exit();
        }, 100);
      }
    },
    [workflowName, options, projectName, exit],
  );

  // Streaming helper — outside render tree
  const handleStream = async (
    stream: ReadableStream<Uint8Array> | null,
    outputPath: string | undefined,
    setContent: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    if (!stream) {
      throw new Error("No stream returned by server");
    }

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fileStream: WriteStream | undefined;

    if (outputPath) {
      fileStream = createWriteStream(outputPath);
      setContent(`Streaming response output to ${outputPath}\n`);
    }

    let done = false;
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      if (readerDone) {
        done = true;
      } else {
        const chunk = decoder.decode(value);
        if (fileStream) {
          fileStream.write(chunk);
        } else {
          setContent((prev: string) => prev + chunk);
        }
      }
    }
    fileStream?.end();
  };

  // Streaming helper for JSON lines
  const handleJsonLinesStream = async (
    stream: ReadableStream<Uint8Array> | null,
    outputPath: string | undefined,
    setContent: React.Dispatch<React.SetStateAction<WorkflowMessage[]>>,
  ) => {
    if (!stream) {
      throw new Error("No stream returned by server");
    }

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fileStream: WriteStream | undefined;

    if (outputPath) {
      fileStream = createWriteStream(outputPath);
    }

    let buffer = "";
    let done = false;
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      if (readerDone) {
        done = true;
      } else {
        const chunk = decoder.decode(value);
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          try {
            const json = JSON.parse(line) as WorkflowMessage;
            if (json.type === "output") {
              if (fileStream) {
                fileStream.write(json.content);
              } else {
                setContent((prev) => [...prev, json]);
              }
            } else {
              setContent((prev) => [...prev, json]);
            }
          } catch {
            setContent((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                type: "error",
                error: `Error parsing line: ${line}`,
              },
            ]);
          }
        }
      }
    }
    fileStream?.end();
  };

  return (
    <Box flexDirection="column" gap={1}>
      <FirstTimeSetup />

      {options.output && !options.wait && (
        <ErrorMessage message="Output file cannot be specified without --wait." />
      )}

      {!(options.output && !options.wait) && (error ?? projectError) && (
        <ErrorMessage
          message={error ?? projectError?.message ?? "Unknown error"}
        />
      )}

      {!(options.output && !options.wait) &&
        !(error ?? projectError) &&
        (loading || !projectName) && (
          <LoadingSpinner message="Resolving project..." />
        )}

      {!(options.output && !options.wait) &&
        !(error ?? projectError) &&
        !(loading || !projectName) && (
          <>
            {isFromConfig && phase === "resolveEnv" && (
              <Text>
                <Text color="cyan">ℹ</Text> Using project name from gensx.yaml:{" "}
                <Text color="cyan">{projectName}</Text>
              </Text>
            )}
            {phase === "resolveEnv" && (
              <EnvironmentResolver
                projectName={projectName}
                specifiedEnvironment={options.env}
                allowCreate={false}
                yes={options.yes}
                onResolved={(env) => {
                  void runWorkflow(env);
                }}
              />
            )}

            {phase === "running" && (
              <LoadingSpinner message="Running workflow..." />
            )}

            {phase === "streaming" && (
              <Box flexDirection="column">
                <Text color="white" bold>
                  Streaming output:
                </Text>
                <Box>
                  <Text color="cyan">{streamContent}</Text>
                </Box>
              </Box>
            )}

            {phase === "progress" && (
              <Box flexDirection="column">
                <Text color="white" bold>
                  Streaming progress events:
                </Text>
                <Box flexDirection="column">
                  {progressContent.map((json, idx) => {
                    switch (json.type) {
                      case "start":
                        return (
                          <Box key={idx} flexDirection="row" gap={1}>
                            <Text color="cyan">Workflow started:</Text>
                            <Text color="white">{json.workflowName}</Text>
                          </Box>
                        );
                      // case "component-start":
                      //   setContent(
                      //     (prev) => prev + `Component started: ${json.componentName}\n`,
                      //   );
                      //   break;
                      // case "component-end":
                      //   setContent(
                      //     (prev) => prev + `Component ended: ${json.componentName}\n`,
                      //   );
                      //   break;
                      case "data":
                        return (
                          <Box key={idx} flexDirection="row" gap={1}>
                            <Text color="cyan">Data:</Text>
                            <Text color="white">
                              {JSON.stringify(json.data)}
                            </Text>
                          </Box>
                        );
                      case "event":
                        return (
                          <Box key={idx} flexDirection="row" gap={1}>
                            <Text color="cyan">Event:</Text>
                            <Text color="white">
                              {JSON.stringify(json.data)}
                            </Text>
                          </Box>
                        );
                      case "object":
                        return (
                          <Box key={idx} flexDirection="row" gap={1}>
                            <Text color="cyan">Object Update:</Text>
                            <Text color="white">
                              {JSON.stringify(json.data)}
                            </Text>
                          </Box>
                        );
                      case "error":
                        return (
                          <Box key={idx} flexDirection="row" gap={1}>
                            <Text color="cyan">Error:</Text>
                            <Text color="red">{json.error}</Text>
                          </Box>
                        );
                      case "end":
                        return (
                          <Box key={idx} flexDirection="row" gap={1}>
                            <Text color="cyan">Workflow ended</Text>
                          </Box>
                        );
                      case "output":
                        return (
                          <Box key={idx} flexDirection="row" gap={1}>
                            <Text color="cyan">Output:</Text>
                            <Text color="white">{json.content}</Text>
                          </Box>
                        );
                    }
                  })}
                </Box>
              </Box>
            )}

            {phase === "done" && (
              <Box flexDirection="column">
                <Box>
                  <Text color="green" bold>
                    ✔
                  </Text>
                  <Text> Workflow execution completed</Text>
                </Box>
                {workflowOutput !== null && (
                  <Box flexDirection="column" marginTop={1}>
                    <Text color="white">Workflow Output:</Text>
                    <Box>
                      <Text color="cyan">
                        {typeof workflowOutput === "string"
                          ? workflowOutput
                          : JSON.stringify(workflowOutput, null, 2)}
                      </Text>
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {logLines.length > 0 && (
              <Static items={logLines}>
                {(line, index) => <Text key={index}>{line}</Text>}
              </Static>
            )}
          </>
        )}
    </Box>
  );
};
