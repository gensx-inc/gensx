import { getAuth } from "../utils/config.js";
import { USER_AGENT } from "../utils/user-agent.js";

interface Workflow {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface ListWorkflowsResponse {
  workflows: Workflow[];
}

/**
 * List workflows for a project in a specific environment
 */
export async function listWorkflows(
  projectName: string,
  environmentName: string,
): Promise<Workflow[]> {
  const auth = await getAuth();
  if (!auth) {
    throw new Error("Not authenticated. Please run 'gensx login' first.");
  }

  const url = new URL(
    `/org/${auth.org}/projects/${encodeURIComponent(projectName)}/environments/${encodeURIComponent(environmentName)}/workflows`,
    auth.apiBaseUrl,
  );

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }

    throw new Error(
      `Failed to list workflows: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as ListWorkflowsResponse;
  return data.workflows;
}

export type { Workflow };
