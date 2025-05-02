/** @jsxImportSource react */
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";

import { ErrorMessage } from "../../components/ErrorMessage.js";
import { LoadingSpinner } from "../../components/LoadingSpinner.js";
import { createEnvironment } from "../../models/environment.js";
import { checkProjectExists, createProject } from "../../models/projects.js";
import { validateAndSelectEnvironment } from "../../utils/env-config.js";
import { readProjectConfig } from "../../utils/project-config.js";

interface Props {
  environmentName: string;
  projectName?: string;
}

type Status =
  | { type: "initial" }
  | { type: "resolving_project" }
  | { type: "confirming_project_creation"; projectName: string }
  | { type: "creating_project"; projectName: string }
  | { type: "done"; projectName: string }
  | { type: "error"; message: string };

function useCreateEnvironmentFlow(
  environmentName: string,
  initialProjectName?: string,
) {
  const [status, setStatus] = useState<Status>({ type: "initial" });
  const [shouldCreate, setShouldCreate] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    async function runFlow() {
      try {
        if (status.type === "initial") {
          if (mounted) {
            setStatus({ type: "resolving_project" });
          }

          // Resolve project name
          let resolvedProjectName = initialProjectName;
          if (!resolvedProjectName) {
            const projectConfig = await readProjectConfig(process.cwd());
            if (!projectConfig?.projectName) {
              throw new Error(
                "No project name found. Either specify --project or create a gensx.yaml file with a 'projectName' field.",
              );
            }
            resolvedProjectName = projectConfig.projectName;
          }

          // Check if project exists
          const projectExists = await checkProjectExists(resolvedProjectName);

          if (!projectExists) {
            if (mounted) {
              setStatus({
                type: "confirming_project_creation",
                projectName: resolvedProjectName,
              });
            }
            return;
          } else {
            await createEnvironment(resolvedProjectName, environmentName);
            const success = await validateAndSelectEnvironment(
              resolvedProjectName,
              environmentName,
            );

            if (!success) {
              throw new Error("Failed to set environment as active");
            }

            if (mounted) {
              setStatus({ type: "done", projectName: resolvedProjectName });
            }
          }
        } else if (
          status.type === "confirming_project_creation" &&
          shouldCreate !== null
        ) {
          if (shouldCreate) {
            if (mounted) {
              setStatus({
                type: "creating_project",
                projectName: status.projectName,
              });
            }
            await createProject(status.projectName, environmentName);
            const success = await validateAndSelectEnvironment(
              status.projectName,
              environmentName,
            );

            if (!success) {
              throw new Error("Failed to set environment as active");
            }

            if (mounted) {
              setStatus({ type: "done", projectName: status.projectName });
            }
          } else {
            if (mounted) {
              setStatus({
                type: "error",
                message: "Project creation cancelled",
              });
            }
            setTimeout(() => {
              process.exit(1);
            }, 100);
          }
        }
      } catch (err) {
        if (mounted) {
          setStatus({
            type: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
        setTimeout(() => {
          process.exit(1);
        }, 100);
      }
    }

    void runFlow();
    return () => {
      mounted = false;
    };
  }, [status, shouldCreate, environmentName, initialProjectName]);

  return { status, setShouldCreate };
}

export function CreateEnvironmentUI({
  environmentName,
  projectName: initialProjectName,
}: Props) {
  const { status, setShouldCreate } = useCreateEnvironmentFlow(
    environmentName,
    initialProjectName,
  );

  useInput((input, key) => {
    if (status.type === "confirming_project_creation") {
      if (input === "y" || input === "Y" || key.return) {
        setShouldCreate(true);
      } else if (input === "n" || input === "N") {
        setShouldCreate(false);
      }
    }
  });

  if (status.type === "error") {
    return <ErrorMessage message={status.message} />;
  }

  if (status.type === "initial" || status.type === "resolving_project") {
    return <LoadingSpinner />;
  }

  if (status.type === "confirming_project_creation") {
    return (
      <Box flexDirection="column" gap={1}>
        <Text>
          Project <Text color="cyan">{status.projectName}</Text> does not exist.
        </Text>
        <Text>
          Would you like to create it? <Text color="gray">(y/N)</Text>
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      {status.type === "creating_project" && (
        <Box>
          <Text>
            Setting up project <Text color="cyan">{status.projectName}</Text>{" "}
            with environment <Text color="cyan">{environmentName}</Text>...
          </Text>
        </Box>
      )}

      {status.type === "done" && (
        <Box>
          <Text>
            <Text bold color="green">
              ✓
            </Text>{" "}
            Environment <Text color="green">{environmentName}</Text> is ready in
            project <Text color="cyan">{status.projectName}</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
}
