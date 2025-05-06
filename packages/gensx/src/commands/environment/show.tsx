import { Box, Text } from "ink";
import { useEffect, useState } from "react";

import { ErrorMessage } from "../../components/ErrorMessage.js";
import { LoadingSpinner } from "../../components/LoadingSpinner.js";
import { checkProjectExists } from "../../models/projects.js";
import { getSelectedEnvironment } from "../../utils/env-config.js";
import { readProjectConfig } from "../../utils/project-config.js";

interface Props {
  projectName?: string;
}

interface UseShowEnvironmentResult {
  loading: boolean;
  error: Error | null;
  projectName: string | null;
  selectedEnvironment: string | null;
}

function useShowEnvironment(
  initialProjectName?: string,
): UseShowEnvironmentResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let mounted = true;

    async function showEnvironmentFlow() {
      try {
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
          throw new Error(`Project ${resolvedProjectName} does not exist.`);
        }

        const selectedEnv = await getSelectedEnvironment(resolvedProjectName);

        if (mounted) {
          setProjectName(resolvedProjectName);
          setSelectedEnvironment(selectedEnv);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setLoading(false);

          setTimeout(() => {
            process.exit(1);
          }, 100);
        }
      }
    }

    void showEnvironmentFlow();
    return () => {
      mounted = false;
    };
  }, [initialProjectName]);

  return { loading, error, projectName, selectedEnvironment };
}

export function ShowEnvironmentUI({ projectName: initialProjectName }: Props) {
  const { loading, error, projectName, selectedEnvironment } =
    useShowEnvironment(initialProjectName);

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box flexDirection="column" gap={1}>
      {selectedEnvironment ? (
        <Text>
          <Text color="blue">ℹ︎</Text> Active environment for project{" "}
          <Text color="cyan">{projectName}</Text>:{" "}
          <Text color="green">{selectedEnvironment}</Text>
        </Text>
      ) : (
        <>
          <Text>
            <Text color="blue">ℹ︎</Text> No active environment set for project{" "}
            <Text color="cyan">{projectName}</Text>
          </Text>

          <Text color="gray" dimColor>
            › Run <Text color="yellow">gensx env select &lt;env-name&gt;</Text>{" "}
            to activate an environment.
          </Text>
        </>
      )}
    </Box>
  );
}
