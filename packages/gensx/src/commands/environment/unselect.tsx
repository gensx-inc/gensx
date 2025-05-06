import { Box, Text, useApp } from "ink";
import { useEffect, useState } from "react";

import { ErrorMessage } from "../../components/ErrorMessage.js";
import { LoadingSpinner } from "../../components/LoadingSpinner.js";
import { checkProjectExists } from "../../models/projects.js";
import { validateAndSelectEnvironment } from "../../utils/env-config.js";
import { readProjectConfig } from "../../utils/project-config.js";

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
  const [projectName, setProjectName] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function unselectEnvironmentFlow() {
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

        await validateAndSelectEnvironment(resolvedProjectName, null);

        if (mounted) {
          setProjectName(resolvedProjectName);
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
  }, [initialProjectName, exit]);

  return { loading, error, projectName, success };
}

export function UnselectEnvironmentUI({
  projectName: initialProjectName,
}: Props) {
  const { loading, error, projectName } =
    useUnselectEnvironment(initialProjectName);

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text>
        <Text color="green">✓</Text> Active environment cleared for project{" "}
        <Text color="cyan">{projectName}</Text>
      </Text>
    </Box>
  );
}
