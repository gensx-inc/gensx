import { Box, Text } from "ink";
import { useEffect, useState } from "react";

import { ErrorMessage } from "../../components/ErrorMessage.js";
import { LoadingSpinner } from "../../components/LoadingSpinner.js";
import { listEnvironments } from "../../models/environment.js";
import { checkProjectExists } from "../../models/projects.js";
import { getSelectedEnvironment } from "../../utils/env-config.js";
import { readProjectConfig } from "../../utils/project-config.js";

interface Environment {
  id: string;
  name: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

interface UseEnvironmentsResult {
  environments: Environment[];
  loading: boolean;
  error: Error | null;
  projectName: string | null;
  selectedEnvironment: string | null;
}

// Custom hook to handle environment data fetching
function useEnvironments(initialProjectName?: string): UseEnvironmentsResult {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        // Resolve and validate project name
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

        const projectExists = await checkProjectExists(resolvedProjectName);
        if (!projectExists) {
          throw new Error(`Project ${resolvedProjectName} does not exist.`);
        }

        // Fetch environments and selected environment for the validated project
        const [envs, selected] = await Promise.all([
          listEnvironments(resolvedProjectName),
          getSelectedEnvironment(resolvedProjectName),
        ]);

        if (mounted) {
          setProjectName(resolvedProjectName);
          setEnvironments(envs);
          setSelectedEnvironment(selected);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setLoading(false);
        }
      }
    }

    void fetchData();
    return () => {
      mounted = false;
    };
  }, [initialProjectName]);

  return { environments, loading, error, projectName, selectedEnvironment };
}

interface Props {
  projectName?: string;
}

export function ListEnvironmentsUI({ projectName: initialProjectName }: Props) {
  const { environments, loading, error, projectName, selectedEnvironment } =
    useEnvironments(initialProjectName);

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
          Found{" "}
          <Text bold color="cyan">
            {environments.length}
          </Text>{" "}
          environment{environments.length === 1 ? "" : "s"} for project{" "}
          <Text bold color="cyan">
            {projectName}
          </Text>
        </Text>
      </Box>

      {environments.length > 0 ? (
        <Box flexDirection="column">
          <Text>{"─".repeat(44)}</Text>
          <Box paddingLeft={1}>
            <Text bold>
              <Text color="cyan">{"NAME".padEnd(20)}</Text>
              <Text color="cyan">{"UPDATED AT"}</Text>
            </Text>
          </Box>
          <Text>{"─".repeat(44)}</Text>

          <Box flexDirection="column">
            {environments.map((env) => (
              <Box key={env.name} paddingLeft={1}>
                <Text>
                  <Text color="green">{env.name.padEnd(20)}</Text>
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
          <Text>{"─".repeat(44)}</Text>
          {selectedEnvironment && (
            <Box paddingTop={1}>
              <Text>
                Selected environment:{" "}
                <Text color="green">{selectedEnvironment}</Text>
              </Text>
            </Box>
          )}
        </Box>
      ) : (
        <Box>
          <Text dimColor>No environments found</Text>
        </Box>
      )}
    </Box>
  );
}
