import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { Box, Text, useApp } from "ink";
import { useEffect, useState } from "react";

import { ErrorMessage } from "../components/ErrorMessage.js";
import { LoadingSpinner } from "../components/LoadingSpinner.js";
import { bundleWorkflow } from "../utils/bundler.js";
import { generateSchema } from "../utils/schema.js";

export interface BuildOptions {
  outDir?: string;
  tsconfig?: string;
  watch?: boolean;
  quiet?: boolean;
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
}

function useBuild(file: string, options: BuildOptions): UseBuildResult {
  const [phase, setPhase] = useState<UseBuildResult["phase"]>("validating");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuildResult | null>(null);
  const { exit } = useApp();

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
        setPhase("bundling");

        const outDir = options.outDir ?? resolve(process.cwd(), ".gensx");
        const schemaFilePath = resolve(outDir, "schema.json");

        const bundlePath = await bundleWorkflow(
          absolutePath,
          outDir,
          options.watch ?? false,
        );

        setPhase("generatingSchema");

        // Generate schema locally
        const workflowSchemas = generateSchema(absolutePath, options.tsconfig);
        writeFileSync(schemaFilePath, JSON.stringify(workflowSchemas, null, 2));

        setResult({
          bundleFile: bundlePath,
          schemaFile: schemaFilePath,
          schemas: workflowSchemas,
        });
        setPhase("done");

        if (!options.quiet) {
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

  return { phase, error, result };
}

interface Props {
  file: string;
  options: BuildOptions;
}

export function BuildWorkflowUI({ file, options }: Props) {
  const { phase, error, result } = useBuild(file, options);

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <Box flexDirection="column" gap={1}>
      {phase === "validating" && (
        <LoadingSpinner message="Validating workflow file..." />
      )}

      {phase === "bundling" && (
        <LoadingSpinner message="Building workflows using docker..." />
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
            {!options.quiet && (
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
export async function build(file: string, options: BuildOptions = {}) {
  const outDir = options.outDir ?? resolve(process.cwd(), ".gensx");
  const schemaFile = resolve(outDir, "schema.json");

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
    options.watch ?? false,
  );

  // Generate schema locally
  const workflowSchemas = generateSchema(absolutePath, options.tsconfig);
  writeFileSync(schemaFile, JSON.stringify(workflowSchemas, null, 2));

  return {
    bundleFile: bundleFilePath,
    schemaFile: schemaFile,
    schemas: workflowSchemas,
  };
}
