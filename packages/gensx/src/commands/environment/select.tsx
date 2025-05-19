import { Box, Text, useApp } from "ink";
import { useEffect, useState } from "react";

import { ErrorMessage } from "../../components/ErrorMessage.js";
import { LoadingSpinner } from "../../components/LoadingSpinner.js";
import { useProjectName } from "../../hooks/useProjectName.js";
import { getAuth } from "../../utils/config.js";
import { validateAndSelectEnvironment } from "../../utils/env-config.js";

interface Props {
  environmentName: string;
  projectName?: string;
}

interface UseSelectEnvironmentResult {
  loading: boolean;
  error: Error | null;
  projectName: string | null;
  environmentName: string | null;
  success: boolean;
}

function useSelectEnvironment(
  envName: string,
  initialProjectName?: string,
): UseSelectEnvironmentResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [environmentName, setEnvironmentName] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { exit } = useApp();
  const {
    loading: projectLoading,
    error: projectError,
    projectName,
  } = useProjectName(initialProjectName);

  useEffect(() => {
    let mounted = true;

    async function selectEnvironmentFlow() {
      if (!projectName) return;

      try {
        // Check authentication first
        const authConfig = await getAuth();
        if (!authConfig) {
          throw new Error("Not authenticated. Please run 'gensx login' first.");
        }

        const success = await validateAndSelectEnvironment(
          projectName,
          envName,
        );

        if (!success) {
          throw new Error(
            `Environment ${envName} does not exist in project ${projectName}`,
          );
        }

        if (mounted) {
          setEnvironmentName(envName);
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

    void selectEnvironmentFlow();
    return () => {
      mounted = false;
    };
  }, [envName, projectName, exit]);

  return {
    loading: loading || projectLoading,
    error: error ?? projectError,
    projectName,
    environmentName,
    success,
  };
}

export function SelectEnvironmentUI({
  environmentName,
  projectName: initialProjectName,
}: Props) {
  const {
    loading,
    error,
    projectName,
    environmentName: selectedEnv,
  } = useSelectEnvironment(environmentName, initialProjectName);

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  if (loading || !projectName) {
    return <LoadingSpinner />;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text>
        <Text color="green">✔</Text> Environment{" "}
        <Text color="green">{selectedEnv}</Text> is now active for project{" "}
        <Text color="cyan">{projectName}</Text>
      </Text>
    </Box>
  );
}
