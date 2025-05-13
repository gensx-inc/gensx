import { Box, Text, useApp } from "ink";
import SelectInput from "ink-select-input";
import { useEffect, useState } from "react";

import { ErrorMessage } from "../../components/ErrorMessage.js";
import { LoadingSpinner } from "../../components/LoadingSpinner.js";
import {
  checkEnvironmentExists,
  createEnvironment,
} from "../../models/environment.js";
import { checkProjectExists, createProject } from "../../models/projects.js";
import { getAuth } from "../../utils/config.js";
import { validateAndSelectEnvironment } from "../../utils/env-config.js";
import { readProjectConfig } from "../../utils/project-config.js";

interface Props {
  environmentName: string;
  projectName?: string;
}

type Step =
  | "initial"
  | "confirming_project_creation"
  | "creating_project"
  | "creating_environment"
  | "done"
  | "error";

interface UseCreateEnvironmentResult {
  loading: boolean;
  error: Error | null;
  projectName: string | null;
  step: Step;
  setShouldCreate: (value: boolean | null) => void;
  projectCreated: boolean;
}

function useCreateEnvironment(
  environmentName: string,
  initialProjectName?: string,
): UseCreateEnvironmentResult {
  const { exit } = useApp();
  const [step, setStep] = useState<Step>("initial");
  const [error, setError] = useState<Error | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [shouldCreate, setShouldCreate] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectCreated, setProjectCreated] = useState(false);

  useEffect(() => {
    let mounted = true;
    let projectConfig: { projectName?: string; description?: string } | null =
      null;

    async function initializeEnvironment() {
      try {
        // Check authentication first
        const authConfig = await getAuth();
        if (!authConfig) {
          throw new Error("Not authenticated. Please run 'gensx login' first.");
        }

        // Resolve project name
        let resolvedProjectName = initialProjectName;

        if (!resolvedProjectName) {
          projectConfig = await readProjectConfig(process.cwd());
          if (!projectConfig?.projectName) {
            throw new Error(
              "No project name found. Either specify --project or create a gensx.yaml file with a 'projectName' field.",
            );
          }
          resolvedProjectName = projectConfig.projectName;
        }

        // Check if project exists
        const projectExists = await checkProjectExists(resolvedProjectName);

        if (!mounted) return;

        if (!projectExists) {
          setProjectName(resolvedProjectName);
          setStep("confirming_project_creation");
          setLoading(false);
        } else {
          setProjectName(resolvedProjectName);

          // Check if the environment already exists
          const environmentExists = await checkEnvironmentExists(
            resolvedProjectName,
            environmentName,
          );

          if (environmentExists) {
            throw new Error(
              `Environment ${environmentName} already exists for project ${resolvedProjectName}`,
            );
          }

          setStep("creating_environment");
          setLoading(false);

          await createEnvironment(resolvedProjectName, environmentName);
          const success = await validateAndSelectEnvironment(
            resolvedProjectName,
            environmentName,
          );

          if (!success) {
            throw new Error("Failed to set environment as active");
          }

          setStep("done");

          setTimeout(() => {
            exit();
          }, 100);
        }
      } catch (err) {
        if (!mounted) return;
        const thrownError = err instanceof Error ? err : new Error(String(err));
        setError(thrownError);
        setStep("error");
        setLoading(false);
        setTimeout(() => {
          exit();
        }, 100);
      }
    }

    // Handle project creation when user confirms
    async function handleProjectCreation() {
      if (step !== "confirming_project_creation" || shouldCreate === null)
        return;

      try {
        if (shouldCreate) {
          setStep("creating_project");

          if (!projectName) {
            throw new Error("Project name is not defined");
          }

          await createProject(
            projectName,
            environmentName,
            projectConfig?.description,
          );

          setProjectCreated(true);

          const success = await validateAndSelectEnvironment(
            projectName,
            environmentName,
          );

          if (!success) {
            throw new Error("Failed to set environment as active");
          }

          setStep("done");
        } else {
          setError(new Error("Project creation cancelled"));
          setStep("error");
          setTimeout(() => {
            exit();
          }, 100);
        }
      } catch (err) {
        if (!mounted) return;
        const thrownError = err instanceof Error ? err : new Error(String(err));
        setError(thrownError);
        setStep("error");
        setTimeout(() => {
          exit();
        }, 100);
      }
    }

    // Initial setup
    if (step === "initial") {
      void initializeEnvironment();
    }

    // Handle project creation confirmation
    if (step === "confirming_project_creation" && shouldCreate !== null) {
      void handleProjectCreation();
    }

    return () => {
      mounted = false;
    };
  }, [
    step,
    shouldCreate,
    environmentName,
    initialProjectName,
    projectName,
    exit,
  ]);

  return {
    loading,
    error,
    projectName,
    step,
    setShouldCreate,
    projectCreated,
  };
}

export function CreateEnvironmentUI({
  environmentName,
  projectName: initialProjectName,
}: Props) {
  const { loading, error, projectName, step, setShouldCreate, projectCreated } =
    useCreateEnvironment(environmentName, initialProjectName);

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  if (loading || step === "creating_project") {
    return <LoadingSpinner />;
  }

  if (step === "confirming_project_creation") {
    const items = [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ];

    return (
      <Box flexDirection="column">
        <Box paddingBottom={1}>
          <Text>
            <Text color="cyan">ℹ</Text> Project{" "}
            <Text color="cyan">{projectName}</Text> does not exist.
          </Text>
        </Box>
        <Text>
          <Text color="blue">➜</Text> Would you like to create it?
        </Text>
        <SelectInput
          items={items}
          onSelect={(item) => {
            setShouldCreate(item.value === "yes");
          }}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      {step === "done" && (
        <Box flexDirection="column">
          {projectCreated && (
            <Text>
              <Text bold color="green">
                ✔
              </Text>{" "}
              Project <Text color="cyan">{projectName}</Text> and environment{" "}
              <Text color="green">{environmentName}</Text> created
            </Text>
          )}
          {!projectCreated && (
            <Text>
              <Text bold color="green">
                ✔
              </Text>{" "}
              Environment <Text color="green">{environmentName}</Text> created
              for project <Text color="cyan">{projectName}</Text>
            </Text>
          )}
          <Text>
            <Text bold color="green">
              ✔
            </Text>{" "}
            Environment <Text color="green">{environmentName}</Text> is now
            active
          </Text>
        </Box>
      )}
    </Box>
  );
}
