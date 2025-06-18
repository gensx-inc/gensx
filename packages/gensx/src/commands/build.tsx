import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { Box, Text, useApp } from "ink";
import { useEffect, useState } from "react";

import { ErrorMessage } from "../components/ErrorMessage.js";
import { LoadingSpinner } from "../components/LoadingSpinner.js";
import { bundleWorkflow } from "../utils/bundler.js";
import { staticallyGenerateWorkflowInfo } from "../utils/workflow-info.js";

export interface BuildOptions {
  outDir?: string;
  tsconfig?: string;
  watch?: boolean;
  verbose?: boolean;
  schemaOnly?: boolean;
}

interface BuildResult {
  bundleFile: string;
  schemaFile: string;
  schemas: unknown;
}

interface UseBuildResult {
  phase: "validating" | "bundling" | "generatingSchema" | "done" | "error";
  error: string | null;
  result: BuildResult | null;
  buildProgress: string[];
}

function useBuild(file: string, options: BuildOptions): UseBuildResult {
  const [phase, setPhase] = useState<UseBuildResult["phase"]>("validating");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuildResult | null>(null);
  const { exit } = useApp();
  const [buildProgress, setBuildProgress] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;

    async function buildWorkflow() {
      try {
        // 1. Validate file exists and is a TypeScript file
        const absolutePath = resolve(process.cwd(), file);
        if (!existsSync(absolutePath)) {
          throw new Error(`File ${file} does not exist`);
        }

        if (!file.endsWith(".ts") && !file.endsWith(".tsx")) {
          throw new Error("Only TypeScript files (.ts or .tsx) are supported");
        }

        if (!mounted) return;

        const outDir = options.outDir ?? resolve(process.cwd(), ".gensx");
        const workflowInfoFilePath = resolve(outDir, "workflow-info.json");
        let bundlePath: string | undefined;

        if (!options.schemaOnly) {
          setPhase("bundling");

          bundlePath = await bundleWorkflow(
            absolutePath,
            outDir,
            (data) => {
              setBuildProgress((prev) => [...prev, data]);
            },
            options.watch ?? false,
          );
        }

        setPhase("generatingSchema");

        // Generate schema locally
        const workflowSchemas = staticallyGenerateWorkflowInfo(
          absolutePath,
          options.tsconfig,
        );
        writeFileSync(
          workflowInfoFilePath,
          JSON.stringify(workflowSchemas, null, 2),
        );

        setResult({
          bundleFile: bundlePath ?? "",
          schemaFile: workflowInfoFilePath,
          schemas: workflowSchemas,
        });
        setPhase("done");

        if (options.verbose) {
          setTimeout(() => {
            exit();
          }, 100);
        }
      } catch (err) {
        if (!mounted) return;
        setError((err as Error).message);
        setPhase("error");
        setTimeout(() => {
          exit();
        }, 100);
      }
    }

    void buildWorkflow();
    return () => {
      mounted = false;
    };
  }, [file, options, exit]);

  return { phase, error, result, buildProgress };
}

interface Props {
  file: string;
  options: BuildOptions;
}

export function BuildWorkflowUI({ file, options }: Props) {
  const { phase, error, result, buildProgress } = useBuild(file, options);

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <Box flexDirection="column" gap={1}>
      {phase === "validating" && (
        <LoadingSpinner message="Validating workflow file..." />
      )}

      {phase === "bundling" && (
        <Box flexDirection="column">
          <LoadingSpinner message="Building workflows using docker..." />
          <Box flexDirection="column">
            {options.verbose &&
              buildProgress.map((line, index) => (
                <Text key={index}>{line}</Text>
              ))}
          </Box>
        </Box>
      )}

      {phase === "generatingSchema" && (
        <Box flexDirection="column">
          <Box>
            <Text color="green" bold>
              ✔
            </Text>
            <Text> Built workflows</Text>
          </Box>
          <LoadingSpinner message="Generating schemas..." />
        </Box>
      )}

      {phase === "done" && result && (
        <Box flexDirection="column">
          <Box flexDirection="column">
            <Box>
              <Text color="green" bold>
                ✔
              </Text>
              <Text> Built workflows</Text>
            </Box>
            <Box>
              <Text color="green" bold>
                ✔
              </Text>
              <Text> Generated schemas</Text>
            </Box>
            {options.verbose && (
              <Box flexDirection="column" marginTop={1}>
                <Text>
                  Bundle: <Text color="cyan">{result.bundleFile}</Text>
                </Text>
                <Text>
                  Schema: <Text color="cyan">{result.schemaFile}</Text>
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

// Keep the original build function for programmatic usage
export async function build(
  file: string,
  options: BuildOptions = {},
  onProgress?: (data: string) => void,
) {
  const outDir = options.outDir ?? resolve(process.cwd(), ".gensx");
  const workflowInfoFile = resolve(outDir, "workflow-info.json");

  // 1. Validate file exists and is a TypeScript file
  const absolutePath = resolve(process.cwd(), file);
  if (!existsSync(absolutePath)) {
    throw new Error(`File ${file} does not exist`);
  }

  if (!file.endsWith(".ts") && !file.endsWith(".tsx")) {
    throw new Error("Only TypeScript files (.ts or .tsx) are supported");
  }

  const bundleFilePath = await bundleWorkflow(
    absolutePath,
    outDir,
    onProgress ??
      (() => {
        // Do nothing
      }),
    options.watch ?? false,
  );

  // Generate schema locally
  const workflowSchemas = staticallyGenerateWorkflowInfo(
    absolutePath,
    options.tsconfig,
  );
  writeFileSync(workflowInfoFile, JSON.stringify(workflowSchemas, null, 2));

  return {
    bundleFile: bundleFilePath,
    workflowInfoFile,
    workflowInfo: workflowSchemas,
  };
}
