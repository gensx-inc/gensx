import { Box, Text, useApp } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { useEffect, useState } from "react";

import { ErrorMessage } from "../../components/ErrorMessage.js";
import { LoadingSpinner } from "../../components/LoadingSpinner.js";
import { checkProjectExists, createProject } from "../../models/projects.js";
import { getAuth } from "../../utils/config.js";
import { validateAndSelectEnvironment } from "../../utils/env-config.js";
import { readProjectConfig } from "../../utils/project-config.js";

interface Props {
  projectName?: string;
  description?: string;
  environmentName?: string;
  yes?: boolean;
}

type Step =
  | "initial"
  | "prompting_project_name"
  | "prompting_environment_name"
  | "confirming_creation"
  | "creating_project"
  | "creating_environment"
  | "done"
  | "error";

interface ProjectConfig {
  projectName?: string;
  description?: string;
  environmentName?: string;
}

interface UseCreateProjectResult {
  loading: boolean;
  error: Error | null;
  step: Step;
  projectConfig: ProjectConfig;
  setProjectName: (name: string) => void;
  setEnvironmentName: (name: string) => void;
  setShouldCreate: (value: boolean | null) => void;
  setStep: (step: Step) => void;
  handleProjectNameSubmit: (value: string) => void;
}

function useCreateProject(
  initialProjectName?: string,
  initialDescription?: string,
  initialEnvironmentName?: string,
  yes?: boolean,
): UseCreateProjectResult {
  const { exit } = useApp();
  const [step, setStep] = useState<Step>("initial");
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [shouldCreate, setShouldCreate] = useState<boolean | null>(null);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>({
    projectName: initialProjectName,
    description: initialDescription,
    environmentName: initialEnvironmentName,
  });

  const setProjectName = (name: string) => {
    setProjectConfig((prev) => ({ ...prev, projectName: name }));
  };

  const handleProjectNameSubmit = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      setProjectName(trimmed);
      // After setting project name, prompt for environment name
      setStep("prompting_environment_name");
    } else {
      setError(
        new Error(
          "No project name found. Either specify --project or create a gensx.yaml file with a 'projectName' field.",
        ),
      );
      setStep("error");
      setTimeout(() => {
        exit();
      }, 100);
    }
  };

  const setEnvironmentName = (name: string) => {
    setProjectConfig((prev) => ({ ...prev, environmentName: name }));
  };

  useEffect(() => {
    let mounted = true;

    async function initializeProject() {
      try {
        // Check authentication first
        const authConfig = await getAuth();
        if (!authConfig) {
          throw new Error("Not authenticated. Please run 'gensx login' first.");
        }

        // Try to read project config from gensx.yaml if not provided via CLI
        let configFromFile: {
          projectName?: string;
          description?: string;
        } | null = null;

        if (!initialProjectName || !initialDescription) {
          try {
            configFromFile = await readProjectConfig(process.cwd());
          } catch {
            // No config file or error reading it, that's okay
          }
        }

        if (!mounted) return;

        // Use CLI args first, then config file, then prompt
        const resolvedConfig = {
          projectName: initialProjectName ?? configFromFile?.projectName,
          description: initialDescription ?? configFromFile?.description,
          environmentName: initialEnvironmentName,
        };

        setProjectConfig(resolvedConfig);

        // Check what we need to prompt for
        if (!resolvedConfig.projectName) {
          setStep("prompting_project_name");
          setLoading(false);
        } else {
          // Check if project already exists
          const projectExists = await checkProjectExists(
            resolvedConfig.projectName,
          );

          if (projectExists) {
            throw new Error(
              `Project ${resolvedConfig.projectName} already exists`,
            );
          }

          // If yes flag is set, skip environment name prompt and go straight to creation
          if (yes) {
            // Set default environment name when using --yes
            setProjectConfig((prev) => ({
              ...prev,
              environmentName: "default",
            }));
            setStep("confirming_creation");
            setShouldCreate(true);
          } else if (resolvedConfig.environmentName) {
            // If environment name provided via CLI, skip the prompt but still show confirmation
            setStep("confirming_creation");
          } else {
            // Only prompt for environment name if not provided via CLI
            setStep("prompting_environment_name");
          }
          setLoading(false);
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

    // Only run initialization once
    if (step === "initial") {
      void initializeProject();
    }

    return () => {
      mounted = false;
    };
  }, [
    step,
    initialProjectName,
    initialDescription,
    initialEnvironmentName,
    yes,
    exit,
  ]);

  // Separate useEffect for handling project creation
  useEffect(() => {
    let mounted = true;

    async function handleProjectCreation() {
      if (step !== "confirming_creation" || shouldCreate === null) return;

      try {
        if (shouldCreate) {
          if (!projectConfig.projectName) {
            throw new Error("Project name is required");
          }

          setStep("creating_project");

          // Create the project with environment
          await createProject(
            projectConfig.projectName,
            projectConfig.environmentName,
            projectConfig.description,
          );

          // Set the environment as active
          if (projectConfig.environmentName) {
            setStep("creating_environment");

            const success = await validateAndSelectEnvironment(
              projectConfig.projectName,
              projectConfig.environmentName,
            );

            if (!success) {
              throw new Error("Failed to set environment as active");
            }
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

    // Handle project creation confirmation
    if (step === "confirming_creation" && shouldCreate !== null) {
      void handleProjectCreation();
    }

    return () => {
      mounted = false;
    };
  }, [step, shouldCreate, projectConfig, exit]);

  return {
    loading,
    error,
    step,
    projectConfig,
    setProjectName,
    setEnvironmentName,
    setShouldCreate,
    setStep,
    handleProjectNameSubmit,
  };
}

export function CreateProjectUI({
  projectName: initialProjectName,
  description: initialDescription,
  environmentName: initialEnvironmentName,
  yes,
}: Props) {
  const {
    loading,
    error,
    step,
    projectConfig,
    setProjectName,
    setEnvironmentName,
    setShouldCreate,
    setStep,
    handleProjectNameSubmit,
  } = useCreateProject(
    initialProjectName,
    initialDescription,
    initialEnvironmentName,
    yes,
  );

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  if (
    loading ||
    step === "creating_project" ||
    step === "creating_environment"
  ) {
    const message =
      step === "creating_project"
        ? "Creating project..."
        : step === "creating_environment"
          ? "Setting up environment..."
          : "Loading...";

    return <LoadingSpinner message={message} />;
  }

  if (step === "prompting_project_name") {
    return (
      <Box flexDirection="column">
        <Text color="blue">
          ➜ <Text color="white">Enter project name:</Text>{" "}
          <TextInput
            value={projectConfig.projectName ?? ""}
            onChange={setProjectName}
            onSubmit={handleProjectNameSubmit}
          />
        </Text>
      </Box>
    );
  }

  if (step === "prompting_environment_name") {
    return (
      <Box flexDirection="column" gap={1}>
        {!initialProjectName && (
          <Text>
            <Text color="cyan">ℹ</Text> Using project name from gensx.yaml:{" "}
            <Text color="cyan">{projectConfig.projectName}</Text>
          </Text>
        )}
        <Text color="blue">
          ➜ <Text color="white">Enter initial environment name:</Text>{" "}
          <TextInput
            value={projectConfig.environmentName ?? "default"}
            onChange={setEnvironmentName}
            onSubmit={(value) => {
              const trimmed = value.trim() || "default";
              setEnvironmentName(trimmed);
              setStep("confirming_creation");
            }}
          />
        </Text>
      </Box>
    );
  }

  if (step === "confirming_creation") {
    return (
      <Box flexDirection="column">
        <Text color="gray">{"─".repeat(40)}</Text>
        <Box paddingLeft={1}>
          <Text>
            <Text color="white">Project Details</Text>
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text color="gray">{"─".repeat(40)}</Text>
          <Box paddingLeft={1}>
            <Text>
              Project: <Text color="cyan">{projectConfig.projectName}</Text>
            </Text>
          </Box>
          <Box paddingLeft={1}>
            <Text>
              Environment:{" "}
              <Text color="cyan">{projectConfig.environmentName}</Text>
            </Text>
          </Box>
          <Text color="gray">{"─".repeat(40)}</Text>
        </Box>

        <Box paddingTop={1} flexDirection="column">
          <Text>
            <Text color="blue">➜</Text> Create this project?
          </Text>
          <SelectInput
            items={[
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ]}
            onSelect={(item) => {
              setShouldCreate(item.value === "yes");
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === "done") {
    return (
      <Box flexDirection="column" gap={1}>
        <Text>
          <Text bold color="green">
            ✔
          </Text>{" "}
          Project <Text color="green">{projectConfig.projectName}</Text> created
          successfully
        </Text>
        <Text>
          <Text bold color="green">
            ✔
          </Text>{" "}
          Environment <Text color="cyan">{projectConfig.environmentName}</Text>{" "}
          created and selected
        </Text>
      </Box>
    );
  }

  return null;
}
