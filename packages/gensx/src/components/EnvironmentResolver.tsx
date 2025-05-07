import { Box, Text, useApp, useInput } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import React, { useCallback, useEffect, useState } from "react";

interface Item {
  isSelected?: boolean;
  label: string;
  value: string;
}

// Core service helpers – replace with real ones
import { createEnvironment, listEnvironments } from "../models/environment.js";
import { checkProjectExists } from "../models/projects.js";
import { getSelectedEnvironment } from "../utils/env-config.js";

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
  const [newEnvName, setNewEnvName] = useState<string>("default");

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

      // 2. Fetch project state
      const [exists, envs, preselected] = await Promise.all([
        checkProjectExists(projectName),
        listEnvironments(projectName),
        getSelectedEnvironment(projectName),
      ]);

      if (!exists) {
        throw new Error(`Project '${projectName}' does not exist.`);
      }

      // 3. Non‑interactive shortcut
      if (yes) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const envName = preselected ?? envs[0]?.name ?? "default";
        // Auto‑create if necessary (but no persistence beyond that)
        if (!envs.some((env) => env.name === envName)) {
          await createEnvironment(projectName, envName);
        }
        finish(envName);
        return;
      }

      // 4. If there was a pre‑selected env, ask confirmation first
      if (preselected) {
        setSelected(preselected);
        setEnvironments(envs.map((env) => env.name));
        setPhase("auto‑resolved");
        return;
      }

      // 5. Otherwise show list prompt
      setEnvironments(envs.map((env) => env.name));
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
        <Text>
          <Spinner /> Resolving environment...
        </Text>
      </Box>
    );
  }

  if (phase === "error" && error) {
    return (
      <Box>
        <Text color="red">❌ {error}</Text>
      </Box>
    );
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
      ...(allowCreate
        ? [{ label: "➕  Create a new environment", value: "__create__" }]
        : []),
    ];

    return (
      <Box flexDirection="column" gap={1}>
        <Text>
          Select an environment for project{" "}
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
      <Box flexDirection="column" gap={1}>
        <Text>Enter a name for the new environment:</Text>
        <TextInput
          value={newEnvName}
          onChange={setNewEnvName}
          onSubmit={(value) => {
            const trimmed = value.trim();
            if (!trimmed) return;
            setPhase("creating");
            void createEnvironment(projectName, trimmed);
            finish(trimmed);
          }}
        />
      </Box>
    );
  }

  if (phase === "creating") {
    return (
      <Box>
        <Text>
          <Spinner /> Creating environment {newEnvName}...
        </Text>
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
  const [choice, setChoice] = useState<"yes" | "no">("yes");

  useInput((_input, key) => {
    if (key.leftArrow || key.rightArrow) {
      setChoice((prev) => (prev === "yes" ? "no" : "yes"));
    }
    if (key.return) {
      if (choice === "yes") {
        onYes();
      } else {
        onNo();
      }
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text>
        Use selected environment <Text color="green">{env}</Text>?
      </Text>
      <Box gap={2}>
        <Text color={choice === "yes" ? "green" : undefined}>Yes</Text>
        <Text color={choice === "no" ? "green" : undefined}>No</Text>
      </Box>
      <Text dimColor>← → to change, Enter to confirm</Text>
    </Box>
  );
};
