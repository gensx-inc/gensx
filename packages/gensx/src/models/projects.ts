import { getAuth } from "../utils/config.js";
import { USER_AGENT } from "../utils/user-agent.js";

interface ListProjectsResponse {
  projects: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  }[];
}

/**
 * List projects
 */
export async function listProjects(): Promise<
  ListProjectsResponse["projects"]
> {
  const auth = await getAuth();
  if (!auth) {
    throw new Error("Not authenticated. Please run 'gensx login' first.");
  }

  const url = new URL(`/org/${auth.org}/projects`, auth.apiBaseUrl);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to list projects: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as ListProjectsResponse;
  return data.projects;
}

interface CreateProjectResponse {
  id: string;
  name: string;
}

/**
 * Create a project
 */
export async function createProject(
  projectName: string,
  environmentName?: string,
  description?: string,
): Promise<CreateProjectResponse> {
  const auth = await getAuth();
  if (!auth) {
    throw new Error("Not authenticated. Please run 'gensx login' first.");
  }

  // Check if the environment already exists
  const exists = await checkProjectExists(projectName);
  if (exists) {
    throw new Error(`Project ${projectName} already exists`);
  }

  const url = new URL(`/org/${auth.org}/projects`, auth.apiBaseUrl);

  let body: { name: string; environmentName?: string; description?: string } = {
    name: projectName,
  };

  if (environmentName) {
    body.environmentName = environmentName;
  }

  if (description) {
    body.description = description;
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create project: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as CreateProjectResponse;
  return data;
}

/**
 * Check if a project exists
 */
export async function checkProjectExists(
  projectName: string,
  {
    token,
    org,
    apiBaseUrl,
  }: { token?: string; org?: string; apiBaseUrl?: string } = {},
): Promise<boolean> {
  if (!token || !org) {
    const auth = await getAuth();
    if (!auth) {
      throw new Error("Not authenticated. Please run 'gensx login' first.");
    }
    token ??= auth.token;
    org ??= auth.org;
    apiBaseUrl ??= auth.apiBaseUrl;
  }

  const url = new URL(
    `/org/${org}/projects/${encodeURIComponent(projectName)}`,
    apiBaseUrl ?? "https://api.gensx.com",
  );

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
    },
  });

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to check project: ${response.status} ${response.statusText}`,
    );
  }

  return true;
}
