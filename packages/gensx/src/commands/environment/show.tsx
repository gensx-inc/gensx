import { Box, Text, useApp } from "ink";
import { useEffect, useState } from "react";

import { ErrorMessage } from "../../components/ErrorMessage.js";
import { LoadingSpinner } from "../../components/LoadingSpinner.js";
import { useProjectName } from "../../hooks/useProjectName.js";
import { getAuth } from "../../utils/config.js";
import { getSelectedEnvironment } from "../../utils/env-config.js";

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
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | null>(
    null,
  );
  const {
    loading: projectLoading,
    error: projectError,
    projectName,
  } = useProjectName(initialProjectName);

  useEffect(() => {
    let mounted = true;

    async function showEnvironmentFlow() {
      if (!projectName) return;

      try {
        // Check authentication first
        const authConfig = await getAuth();
        if (!authConfig) {
          throw new Error("Not authenticated. Please run 'gensx login' first.");
        }

        const selectedEnv = await getSelectedEnvironment(projectName);

        if (mounted) {
          setSelectedEnvironment(selectedEnv);
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

    void showEnvironmentFlow();
    return () => {
      mounted = false;
    };
  }, [projectName, exit]);

  return {
    loading: loading || projectLoading,
    error: error ?? projectError,
    projectName,
    selectedEnvironment,
  };
}

export function ShowEnvironmentUI({ projectName: initialProjectName }: Props) {
  const { loading, error, projectName, selectedEnvironment } =
    useShowEnvironment(initialProjectName);

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  if (loading || !projectName) {
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
