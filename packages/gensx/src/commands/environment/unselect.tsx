/** @jsxImportSource react */
import { Box, Text } from "ink";
import { useEffect, useState } from "react";

import { ErrorMessage } from "../../components/ErrorMessage.js";
import { LoadingSpinner } from "../../components/LoadingSpinner.js";
import { checkProjectExists } from "../../models/projects.js";
import { validateAndSelectEnvironment } from "../../utils/env-config.js";
import { readProjectConfig } from "../../utils/project-config.js";

interface Props {
  projectName?: string;
}

type Status =
  | { type: "initial" }
  | { type: "loading" }
  | { type: "done"; projectName: string }
  | { type: "error"; message: string };

export function UnselectEnvironmentUI({
  projectName: initialProjectName,
}: Props) {
  const [status, setStatus] = useState<Status>({ type: "initial" });

  useEffect(() => {
    let mounted = true;

    async function unselectEnvironmentFlow() {
      try {
        if (mounted) {
          setStatus({ type: "loading" });
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
          throw new Error(`Project ${resolvedProjectName} does not exist.`);
        }

        await validateAndSelectEnvironment(resolvedProjectName, null);

        if (mounted) {
          setStatus({
            type: "done",
            projectName: resolvedProjectName,
          });
        }
      } catch (err) {
        if (mounted) {
          setStatus({
            type: "error",
            message: err instanceof Error ? err.message : String(err),
          });
          // Give time for the message to be displayed before exiting
          setTimeout(() => {
            process.exit(1);
          }, 100);
        }
      }
    }

    void unselectEnvironmentFlow();
    return () => {
      mounted = false;
    };
  }, [initialProjectName]);

  if (status.type === "error") {
    return <ErrorMessage message={status.message} />;
  }

  if (status.type === "initial" || status.type === "loading") {
    return <LoadingSpinner />;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text>
        <Text color="green">✓</Text> Active environment cleared for project{" "}
        <Text color="cyan">{status.projectName}</Text>
      </Text>
    </Box>
  );
}
