import { useApp } from "ink";
import { useEffect, useState } from "react";

import { checkProjectExists } from "../models/projects.js";
import { readProjectConfig } from "../utils/project-config.js";

interface UseProjectNameResult {
  loading: boolean;
  error: Error | null;
  projectName: string | null;
  isFromConfig: boolean;
}

export function useProjectName(
  initialProjectName?: string,
  skipValidation?: boolean,
): UseProjectNameResult {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [isFromConfig, setIsFromConfig] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function resolveProjectName() {
      try {
        let resolvedProjectName = initialProjectName;
        if (!resolvedProjectName) {
          const projectConfig = await readProjectConfig(process.cwd());
          if (!projectConfig?.projectName) {
            throw new Error(
              "No project name found. Either specify --project or create a gensx.yaml file with a 'projectName' field.",
            );
          }
          resolvedProjectName = projectConfig.projectName;
          if (mounted) {
            setIsFromConfig(true);
          }
        }

        // Only check if project exists if validation is not skipped
        if (!skipValidation) {
          const projectExists = await checkProjectExists(resolvedProjectName);
          if (!projectExists) {
            throw new Error(`Project ${resolvedProjectName} does not exist.`);
          }
        }

        if (mounted) {
          setProjectName(resolvedProjectName);
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

    void resolveProjectName();
    return () => {
      mounted = false;
    };
  }, [initialProjectName, exit, skipValidation]);

  return { loading, error, projectName, isFromConfig };
}
