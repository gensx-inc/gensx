import { getSelectedEnvironment, readProjectConfig } from "@gensx/core";

interface ProjectEnvConfig {
  project: string;
  environment: string;
}

export function getProjectAndEnvironment(props: {
  project?: string;
  environment?: string;
}): ProjectEnvConfig {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const projectConfig = readProjectConfig(process.cwd()) as
    | { projectName: string }
    | undefined;

  const project =
    props.project ??
    process.env.GENSX_PROJECT ??
    projectConfig?.projectName ??
    "";

  if (!project) {
    throw new Error(
      "Project must be provided via props, a gensx.yaml file, or the GENSX_PROJECT environment variable",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const selectedEnvironment = getSelectedEnvironment(project) as
    | string
    | undefined;

  let environment =
    props.environment ?? process.env.GENSX_ENV ?? selectedEnvironment ?? "";

  if (!environment) {
    throw new Error(
      "Environment must be provided via props, set in the CLI via `gensx env select`, or the GENSX_ENV environment variable",
    );
  }

  return { project, environment };
}
