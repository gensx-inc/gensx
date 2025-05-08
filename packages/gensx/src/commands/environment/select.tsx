import { Box, Text, useApp } from "ink";
import { useEffect, useState } from "react";

import { ErrorMessage } from "../../components/ErrorMessage.js";
import { LoadingSpinner } from "../../components/LoadingSpinner.js";
import { checkProjectExists } from "../../models/projects.js";
import { validateAndSelectEnvironment } from "../../utils/env-config.js";
import { readProjectConfig } from "../../utils/project-config.js";

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
  const [projectName, setProjectName] = useState<string | null>(null);
  const [environmentName, setEnvironmentName] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { exit } = useApp();

  useEffect(() => {
    let mounted = true;

    async function selectEnvironmentFlow() {
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

        const success = await validateAndSelectEnvironment(
          resolvedProjectName,
          envName,
        );

        if (!success) {
          throw new Error(
            `Environment ${envName} does not exist in project ${resolvedProjectName}`,
          );
        }

        if (mounted) {
          setProjectName(resolvedProjectName);
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
  }, [envName, initialProjectName]);

  return { loading, error, projectName, environmentName, success };
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

  if (loading) {
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
