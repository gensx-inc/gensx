import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { Box, Text, useApp } from "ink";
import { useEffect, useState } from "react";

import { ErrorMessage } from "../../components/ErrorMessage.js";
import { LoadingSpinner } from "../../components/LoadingSpinner.js";
import { getExampleNames } from "./supported-examples.js";

const execAsync = promisify(exec);

export interface CloneExampleOptions {
  project?: string;
  description?: string;
  env?: string;
  yes?: boolean;
}

interface CloneExampleUIProps {
  exampleName: string;
  projectName?: string;
  description?: string;
  environmentName?: string;
  yes?: boolean;
}

export function CloneExampleUI({
  exampleName,
  projectName,
  description: _description,
  environmentName: _environmentName,
  yes,
}: CloneExampleUIProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState("Validating example...");
  const { exit } = useApp();

  useEffect(() => {
    let mounted = true;

    async function cloneExample() {
      try {
        // Validate example exists using shared examples
        const knownExamples = getExampleNames();

        if (!knownExamples.includes(exampleName)) {
          throw new Error(
            `Unknown example: ${exampleName}. Run 'gensx examples list' to see available examples.`,
          );
        }

        const targetDir = projectName ?? exampleName;
        setStep("Checking target directory...");

        // Check if target directory exists
        const targetPath = path.resolve(targetDir);
        if (fs.existsSync(targetPath)) {
          throw new Error(
            `Directory ${targetDir} already exists. Please choose a different name or remove the existing directory.`,
          );
        }

        setStep("Cloning example...");

        // Use degit to clone the example
        const repoUrl = `gensx-inc/gensx/examples/${exampleName}`;
        const degitCommand = `npx degit ${repoUrl} ${targetDir}`;

        await execAsync(degitCommand);

        setStep("Installing dependencies...");

        // Change to the target directory and install dependencies
        const installCommand = "npm install";
        await execAsync(installCommand, { cwd: targetPath });

        if (mounted) {
          setSuccess(true);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setLoading(false);
        }
      }
    }

    void cloneExample();

    return () => {
      mounted = false;
    };
  }, [exampleName, projectName, yes, exit]);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        exit();
      }, 2000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [success, error, exit]);

  if (loading) {
    return <LoadingSpinner message={step} />;
  }

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  if (success) {
    const targetDir = projectName ?? exampleName;
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold color="green">
          ✅ Successfully cloned {exampleName} to {targetDir}
        </Text>
        <Text color="gray">Next steps:</Text>
        <Box marginLeft={2}>
          <Text color="gray">1. cd {targetDir}</Text>
        </Box>
        <Box marginLeft={2}>
          <Text color="gray">
            2. Follow the README.md for setup instructions
          </Text>
        </Box>
      </Box>
    );
  }

  return null;
}
