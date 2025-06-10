import { Box, Text, useApp } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import React, { useCallback, useEffect, useState } from "react";

interface Item {
  isSelected?: boolean;
  label: string;
  value: string;
}

// Core service helpers – replace with real ones
import { createEnvironment, listEnvironments } from "../models/environment.js";
import { checkProjectExists, createProject } from "../models/projects.js";
import {
  getSelectedEnvironment,
  validateAndSelectEnvironment,
} from "../utils/env-config.js";
import { readProjectConfig } from "../utils/project-config.js";
import { ErrorMessage } from "./ErrorMessage.js";
import { LoadingSpinner } from "./LoadingSpinner.js";

interface Props {
  projectName: string;
  specifiedEnvironment?: string;
  allowCreate?: boolean;
  /** If true, auto‑select without prompting */
  yes?: boolean;
  /** Callback once we have a confirmed env */
  onResolved: (envName: string) => void;
}

/** Local phase machine */
type Phase =
  | "loading"
  | "auto‑resolved"
  | "select"
  | "createPrompt"
  | "creating"
  | "done"
  | "error";

export const EnvironmentResolver: React.FC<Props> = ({
  projectName,
  specifiedEnvironment,
  allowCreate = true,
  yes = false,
  onResolved,
}) => {
  const { exit } = useApp();

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [environments, setEnvironments] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [newEnvName, setNewEnvName] = useState<string>("");
  const [projectExists, setProjectExists] = useState(false);
  const [projectConfig, setProjectConfig] = useState<{
    public?: boolean;
  } | null>(null);

  //-----------------------------------------------------------
  // Helpers
  //-----------------------------------------------------------
  const finish = useCallback(
    (envName: string) => {
      setPhase("done");
      onResolved(envName);
    },
    [onResolved],
  );

  const bootstrap = useCallback(async () => {
    try {
      // 1. Flag overrides everything
      if (specifiedEnvironment) {
        finish(specifiedEnvironment);
        return;
      }

      const cfg = await readProjectConfig(process.cwd());
      setProjectConfig(cfg);

      // 2. Fetch project state
      const [exists, envs, preselected] = await Promise.all([
        checkProjectExists(projectName),
        listEnvironments(projectName),
        getSelectedEnvironment(projectName),
      ]);

      setProjectExists(exists);

      if (!allowCreate && !exists) {
        throw new Error(`Project '${projectName}' does not exist.`);
      }

      // 3. Non‑interactive shortcut
      if (yes) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const envName = preselected ?? envs[0]?.name ?? "default";
        // Auto‑create if necessary (but no persistence beyond that)
        if (!envs.some((env) => env.name === envName)) {
          if (!exists) {
            await createProject(
              projectName,
              envName,
              undefined,
              projectConfig?.public,
            );
            await validateAndSelectEnvironment(projectName, envName);
          } else {
            await createEnvironment(projectName, envName);
          }
        }
        finish(envName);
        return;
      }

      // 4. If there was a pre‑selected env, ask confirmation first
      if (preselected) {
        setSelected(preselected);
        setEnvironments(envs.map((env) => env.name));
        setNewEnvName(envs.length === 0 ? "default" : "");
        setPhase("auto‑resolved");
        return;
      }

      // 5. Otherwise show list prompt
      setEnvironments(envs.map((env) => env.name));
      setNewEnvName(envs.length === 0 ? "default" : "");
      setPhase("select");
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
      setTimeout(() => {
        exit();
      }, 50);
    }
  }, [specifiedEnvironment, projectName, yes, finish, exit]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (phase === "loading") {
    return (
      <Box>
        <LoadingSpinner message="Resolving environment..." />
      </Box>
    );
  }

  if (phase === "error" && error) {
    return <ErrorMessage message={error} />;
  }

  // 1️⃣ Confirm use of pre‑selected environment
  if (phase === "auto‑resolved" && selected) {
    return (
      <ConfirmSelected
        env={selected}
        onYes={() => {
          finish(selected);
        }}
        onNo={() => {
          setPhase("select");
        }}
      />
    );
  }

  // 2️⃣ Select from existing list or create new
  if (phase === "select") {
    const items: Item[] = [
      ...environments.map((name) => ({ label: name, value: name })),
      ...(allowCreate ? [{ label: "+ create new", value: "__create__" }] : []),
    ];

    return (
      <Box flexDirection="column">
        <Text>
          <Text color="blue">➜</Text> Select an environment for project{" "}
          <Text color="cyan">{projectName}</Text>:
        </Text>
        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value === "__create__") {
              setPhase("createPrompt");
            } else {
              finish(item.value);
            }
          }}
        />
      </Box>
    );
  }

  // 3️⃣ Ask for new env name
  if (phase === "createPrompt") {
    return (
      <Box flexDirection="column">
        <Text color="blue">
          ➜ <Text color="white">Enter a name for the new environment:</Text>{" "}
          <TextInput
            value={newEnvName}
            onChange={setNewEnvName}
            onSubmit={(value) => {
              const trimmed = value.trim();
              if (!trimmed) return;
              setPhase("creating");
              void (async () => {
                try {
                  if (!projectExists) {
                    await createProject(
                      projectName,
                      trimmed,
                      undefined,
                      projectConfig?.public,
                    );
                    await validateAndSelectEnvironment(projectName, trimmed);
                  } else {
                    await createEnvironment(projectName, trimmed);
                  }
                  finish(trimmed);
                } catch (err) {
                  setError((err as Error).message);
                  setPhase("error");
                  setTimeout(() => {
                    exit();
                  }, 50);
                }
              })();
            }}
          />
        </Text>
      </Box>
    );
  }

  if (phase === "creating") {
    return (
      <Box>
        <LoadingSpinner
          message={
            !projectExists
              ? `Creating project ${projectName} and environment ${newEnvName}...`
              : `Creating environment ${newEnvName}...`
          }
        />
      </Box>
    );
  }

  // done – we unmount via onResolved in parent
  return null;
};

interface ConfirmProps {
  env: string;
  onYes: () => void;
  onNo: () => void;
}

const ConfirmSelected: React.FC<ConfirmProps> = ({ env, onYes, onNo }) => {
  const items: Item[] = [
    { label: "Yes", value: "yes" },
    { label: "No", value: "no" },
  ];

  return (
    <Box flexDirection="column">
      <Text>
        <Text color="blue">➜</Text> Use selected environment{" "}
        <Text color="green">{env}</Text>?
      </Text>
      <SelectInput
        items={items}
        onSelect={(item) => {
          if (item.value === "yes") {
            onYes();
          } else {
            onNo();
          }
        }}
      />
    </Box>
  );
};
