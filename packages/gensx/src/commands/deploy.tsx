import fs from "node:fs";

import axios from "axios";
import FormData from "form-data";
import { Box, Text, useApp } from "ink";
import React, { useCallback, useState } from "react";

import { EnvironmentResolver } from "../components/EnvironmentResolver.js";
import { ErrorMessage } from "../components/ErrorMessage.js";
import { LoadingSpinner } from "../components/LoadingSpinner.js";
import { useProjectName } from "../hooks/useProjectName.js";
import { getAuth } from "../utils/config.js";
import { USER_AGENT } from "../utils/user-agent.js";
import { build } from "./build.js";

interface DeployOptions {
  project?: string;
  envVar?: Record<string, string>;
  env?: string;
  yes?: boolean;
}

interface DeploymentResponse {
  id: string;
  projectId: string;
  projectName: string;
  environmentId: string;
  environmentName: string;
  buildId: string;
  bundleSize: number;
  workflows: {
    id: string;
    name: string;
    inputSchema: object;
    outputSchema: object;
  }[];
}

type Phase = "resolveEnv" | "building" | "deploying" | "done" | "error";

interface Props {
  file: string;
  options: DeployOptions;
}

export const DeployUI: React.FC<Props> = ({ file, options }) => {
  const { exit } = useApp();
  const [phase, setPhase] = useState<Phase>("resolveEnv");
  const [error, setError] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<DeploymentResponse | null>(null);
  const [auth, setAuth] = useState<Awaited<ReturnType<typeof getAuth>>>(null);
  const {
    loading,
    error: projectError,
    projectName,
    isFromConfig,
  } = useProjectName(options.project);

  const deployWorkflow = useCallback(
    async (environment: string) => {
      try {
        setPhase("building");

        // 1. Build the workflow
        const { bundleFile, schemas } = await build(file);

        // 2. Get auth config
        const authConfig = await getAuth();
        if (!authConfig) {
          throw new Error("Not authenticated. Please run 'gensx login' first.");
        }
        setAuth(authConfig);

        setPhase("deploying");

        // 3. Create form data with bundle
        const form = new FormData();
        form.append("file", fs.createReadStream(bundleFile), "bundle.js");
        if (options.envVar) {
          form.append("environmentVariables", JSON.stringify(options.envVar));
        }
        form.append("schemas", JSON.stringify(schemas));

        // Use the project-specific deploy endpoint
        const url = new URL(
          `/org/${authConfig.org}/projects/${encodeURIComponent(
            projectName!,
          )}/environments/${encodeURIComponent(environment)}/deploy`,
          authConfig.apiBaseUrl,
        );

        const response = await axios.post(url.toString(), form, {
          headers: {
            Authorization: `Bearer ${authConfig.token}`,
            "User-Agent": USER_AGENT,
          },
        });

        if (response.status >= 400) {
          throw new Error(
            `Failed to deploy: ${response.status} ${response.statusText}`,
          );
        }

        const deploymentData = response.data as DeploymentResponse;
        setDeployment(deploymentData);
        setPhase("done");

        setTimeout(() => {
          exit();
        }, 100);
      } catch (err) {
        setError((err as Error).message);
        setPhase("error");
        setTimeout(() => {
          exit();
        }, 100);
      }
    },
    [file, options, projectName, exit],
  );

  if (error || projectError) {
    return (
      <ErrorMessage
        message={error ?? projectError?.message ?? "Unknown error"}
      />
    );
  }

  if (loading || !projectName) {
    return <LoadingSpinner message="Resolving project..." />;
  }

  return (
    <Box flexDirection="column" gap={1}>
      {isFromConfig && phase === "resolveEnv" && (
        <Text>
          <Text color="cyan">ℹ</Text> Using project name from gensx.yaml:{" "}
          <Text color="cyan">{projectName}</Text>
        </Text>
      )}

      {phase === "resolveEnv" && (
        <EnvironmentResolver
          projectName={projectName}
          specifiedEnvironment={options.env}
          allowCreate={true}
          yes={options.yes}
          onResolved={(env) => {
            void deployWorkflow(env);
          }}
        />
      )}

      {phase === "building" && (
        <LoadingSpinner message="Building workflow using docker..." />
      )}

      {phase === "deploying" && (
        <LoadingSpinner message="Deploying to GenSX Cloud..." />
      )}

      {phase === "done" && deployment && (
        <Box flexDirection="column">
          <Box>
            <Text color="green" bold>
              ✓
            </Text>
            <Text> Deployment completed successfully</Text>
          </Box>
          <Box flexDirection="column" marginTop={1}>
            <Text color="cyan">Available Workflows:</Text>
            <Box flexDirection="column">
              {deployment.workflows.map((workflow) => (
                <Text key={workflow.id} color="white">
                  - {workflow.name}
                </Text>
              ))}
            </Box>
          </Box>
          <Box marginTop={1} flexDirection="column">
            <Text color="cyan">
              Dashboard: {auth?.consoleBaseUrl}/{auth?.org}/
              {deployment.projectName}/{deployment.environmentName}/workflows
              {deployment.buildId ? `?deploymentId=${deployment.buildId}` : ""}
            </Text>
          </Box>
          <Box marginTop={1} flexDirection="column">
            <Text>Project: {deployment.projectName}</Text>
            <Text>Environment: {deployment.environmentName}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};
