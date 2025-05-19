import { Box, Text, useApp } from "ink";
import { useEffect, useState } from "react";

import { ErrorMessage } from "../../components/ErrorMessage.js";
import { LoadingSpinner } from "../../components/LoadingSpinner.js";
import { useProjectName } from "../../hooks/useProjectName.js";
import { getAuth } from "../../utils/config.js";
import { validateAndSelectEnvironment } from "../../utils/env-config.js";

interface Props {
  projectName?: string;
}

interface UseUnselectEnvironmentResult {
  loading: boolean;
  error: Error | null;
  projectName: string | null;
  success: boolean;
}

function useUnselectEnvironment(
  initialProjectName?: string,
): UseUnselectEnvironmentResult {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    loading: projectLoading,
    error: projectError,
    projectName,
  } = useProjectName(initialProjectName);

  useEffect(() => {
    let mounted = true;

    async function unselectEnvironmentFlow() {
      if (!projectName) return;

      try {
        // Check authentication first
        const authConfig = await getAuth();
        if (!authConfig) {
          throw new Error("Not authenticated. Please run 'gensx login' first.");
        }

        await validateAndSelectEnvironment(projectName, null);

        if (mounted) {
          setSuccess(true);
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

    void unselectEnvironmentFlow();
    return () => {
      mounted = false;
    };
  }, [projectName, exit]);

  return {
    loading: loading || projectLoading,
    error: error ?? projectError,
    projectName,
    success,
  };
}

export function UnselectEnvironmentUI({
  projectName: initialProjectName,
}: Props) {
  const { loading, error, projectName } =
    useUnselectEnvironment(initialProjectName);

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  if (loading || !projectName) {
    return <LoadingSpinner />;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text>
        <Text color="green">✔</Text> Active environment cleared for project{" "}
        <Text color="cyan">{projectName}</Text>
      </Text>
    </Box>
  );
}
