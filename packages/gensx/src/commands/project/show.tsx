import { Box, Text, useApp } from "ink";
import { useEffect, useState } from "react";

import { ErrorMessage } from "../../components/ErrorMessage.js";
import { LoadingSpinner } from "../../components/LoadingSpinner.js";
import { useProjectName } from "../../hooks/useProjectName.js";
import { listEnvironments } from "../../models/environment.js";
import { listWorkflows, Workflow } from "../../models/workflows.js";
import { getAuth } from "../../utils/config.js";
import { getSelectedEnvironment } from "../../utils/env-config.js";

interface Props {
  projectName?: string;
}

interface Environment {
  id: string;
  name: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

interface UseShowProjectResult {
  loading: boolean;
  error: Error | null;
  projectName: string | null;
  selectedEnvironment: string | null;
  environments: Environment[];
  workflows: Workflow[];
}

function useShowProject(initialProjectName?: string): UseShowProjectResult {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | null>(
    null,
  );
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const {
    loading: projectLoading,
    error: projectError,
    projectName,
  } = useProjectName(initialProjectName);

  useEffect(() => {
    let mounted = true;

    async function showProjectFlow() {
      if (!projectName) return;

      try {
        // Check authentication first
        const authConfig = await getAuth();
        if (!authConfig) {
          throw new Error("Not authenticated. Please run 'gensx login' first.");
        }

        // Fetch both selected environment and all environments
        const [selectedEnv, envs] = await Promise.all([
          getSelectedEnvironment(projectName),
          listEnvironments(projectName),
        ]);

        if (mounted) {
          setSelectedEnvironment(selectedEnv);
          setEnvironments(envs);

          // If there's a selected environment, fetch workflows for it
          if (selectedEnv) {
            try {
              const workflowList = await listWorkflows(
                projectName,
                selectedEnv,
              );
              setWorkflows(workflowList);
            } catch (workflowError) {
              // If workflow fetching fails, just set empty array but don't error the whole component
              console.warn("Failed to fetch workflows:", workflowError);
              setWorkflows([]);
            }
          }

          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setLoading(false);
          setTimeout(() => {
            exit();
          }, 100);
        }
      }
    }

    void showProjectFlow();
    return () => {
      mounted = false;
    };
  }, [projectName, exit]);

  return {
    loading: loading || projectLoading,
    error: error ?? projectError,
    projectName,
    selectedEnvironment,
    environments,
    workflows,
  };
}

export function ShowProjectUI({ projectName: initialProjectName }: Props) {
  const {
    loading,
    error,
    projectName,
    selectedEnvironment,
    environments,
    workflows,
  } = useShowProject(initialProjectName);

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  if (loading || !projectName) {
    return <LoadingSpinner />;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Box>
        <Text>
          <Text color="blue">ℹ︎</Text> Project:{" "}
          <Text bold color="cyan">
            {projectName}
          </Text>
        </Text>
      </Box>

      <Box flexDirection="column" gap={0} paddingTop={1}>
        <Text>
          <Text bold color="white">
            Environments
          </Text>
          <Text color="gray"> ({environments.length})</Text>
        </Text>

        {environments.length > 0 ? (
          <Box flexDirection="column">
            <Text color="gray">{"─".repeat(54)}</Text>
            <Box paddingLeft={1}>
              <Text bold>
                <Text color="cyan">{"NAME".padEnd(20)}</Text>
                <Text color="cyan">{"SELECTED".padEnd(12)}</Text>
                <Text color="cyan">{"UPDATED AT"}</Text>
              </Text>
            </Box>
            <Text color="gray">{"─".repeat(54)}</Text>

            <Box flexDirection="column">
              {environments.map((env) => (
                <Box key={env.id} paddingLeft={1}>
                  <Text>
                    <Text color="green">{env.name.padEnd(20)}</Text>
                    <Text
                      color={
                        env.name === selectedEnvironment ? "green" : "gray"
                      }
                    >
                      {(env.name === selectedEnvironment ? "✓" : "").padEnd(12)}
                    </Text>
                    <Text dimColor>
                      {new Date(env.updatedAt)
                        .toLocaleString(undefined, {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                        .replace(/,/, "")}
                    </Text>
                  </Text>
                </Box>
              ))}
            </Box>
            <Text color="gray">{"─".repeat(54)}</Text>
          </Box>
        ) : (
          <Box paddingLeft={1}>
            <Text dimColor>No environments found</Text>
            <Text color="gray" dimColor>
              › Run{" "}
              <Text color="yellow">gensx env create &lt;env-name&gt;</Text> to
              create your first environment.
            </Text>
          </Box>
        )}
      </Box>

      {selectedEnvironment && workflows.length > 0 && (
        <Box flexDirection="column" gap={0} paddingTop={1}>
          <Text>
            <Text bold color="white">
              Workflows in
            </Text>
            <Text color="cyan"> {selectedEnvironment}</Text>
            <Text color="gray"> ({workflows.length})</Text>
          </Text>

          <Box flexDirection="column">
            <Text color="gray">{"─".repeat(54)}</Text>
            <Box paddingLeft={1}>
              <Text bold>
                <Text color="cyan">{"NAME".padEnd(32)}</Text>
                <Text color="cyan">{"UPDATED AT"}</Text>
              </Text>
            </Box>
            <Text color="gray">{"─".repeat(54)}</Text>

            <Box flexDirection="column">
              {workflows.map((workflow) => (
                <Box key={workflow.id} paddingLeft={1}>
                  <Text>
                    <Text color="green">
                      {(workflow.name ?? "Unknown").padEnd(32)}
                    </Text>
                    <Text dimColor>
                      {new Date(workflow.updatedAt)
                        .toLocaleString(undefined, {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                        .replace(/,/, "")}
                    </Text>
                  </Text>
                </Box>
              ))}
            </Box>
            <Text color="gray">{"─".repeat(54)}</Text>
          </Box>
        </Box>
      )}

      {selectedEnvironment && workflows.length === 0 && (
        <Box paddingTop={1} gap={1} flexDirection="column">
          <Text>
            <Text>No workflows found in</Text>{" "}
            <Text color="cyan">{selectedEnvironment}</Text>
            <Text> environment.</Text>
          </Text>
          <Text color="gray" dimColor>
            › Deploy a workflow with{" "}
            <Text color="yellow">gensx deploy &lt;workflow-file&gt;</Text>
          </Text>
        </Box>
      )}

      {environments.length > 0 && !selectedEnvironment && (
        <Box paddingTop={1}>
          <Text color="gray" dimColor>
            › Run <Text color="yellow">gensx env select &lt;env-name&gt;</Text>{" "}
            to activate an environment.
          </Text>
        </Box>
      )}
    </Box>
  );
}
