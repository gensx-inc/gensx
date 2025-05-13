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

interface CliOptions {
  input: string;
  wait: boolean;
  project?: string;
  env?: string;
  output?: string;
  yes?: boolean;
}

interface Props {
  workflowName: string;
  options: CliOptions;
}

type Phase = "resolveEnv" | "running" | "streaming" | "done" | "error";

export const RunWorkflowUI: React.FC<Props> = ({ workflowName, options }) => {
  const { exit } = useApp();

  const [phase, setPhase] = useState<Phase>("resolveEnv");
  const [error, setError] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [streamContent, setStreamContent] = useState<string>("");
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

        // WAIT=true path – handle streaming vs JSON response
        const isStream = response.headers
          .get("Content-Type")
          ?.includes("stream");

        if (isStream) {
          setPhase("streaming");
          await handleStream(response.body, options.output, setStreamContent);
          setPhase("done");
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
    } else {
      setContent("Streaming response output:\n");
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
    setLogLines((ls) => [...ls, "Workflow execution completed"]);
  };

  if (error || projectError) {
    return (
      <ErrorMessage
        message={error ?? projectError?.message ?? "Unknown error"}
      />
    );
  }

  if (loading || !projectName) {
    return <LoadingSpinner message="Resolving project..." />;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <FirstTimeSetup />

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

      {phase === "running" && <LoadingSpinner message="Running workflow..." />}

      {phase === "streaming" && (
        <Box flexDirection="column">
          <Text color="yellow" bold>
            Streaming output...
          </Text>
          <Box borderStyle="round" borderColor="cyan" padding={1} marginTop={1}>
            <Text color="white">{streamContent}</Text>
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
                  {JSON.stringify(workflowOutput, null, 2)}
                </Text>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Final immutable logs */}
      {logLines.length > 0 && (
        <Static items={logLines}>
          {(line, index) => <Text key={index}>{line}</Text>}
        </Static>
      )}
    </Box>
  );
};
