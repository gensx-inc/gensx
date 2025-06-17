import { Box, Text, useApp } from "ink";
import { useEffect, useState } from "react";

import { ErrorMessage } from "../../components/ErrorMessage.js";
import { LoadingSpinner } from "../../components/LoadingSpinner.js";
import { listProjects } from "../../models/projects.js";
import { getAuth } from "../../utils/config.js";

interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface UseProjectsResult {
  projects: Project[];
  loading: boolean;
  error: Error | null;
}

function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { exit } = useApp();

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        // Check authentication first
        const authConfig = await getAuth();
        if (!authConfig) {
          throw new Error("Not authenticated. Please run 'gensx login' first.");
        }

        // Fetch projects
        const projectList = await listProjects();

        if (mounted) {
          setProjects(projectList);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setLoading(false);
          setTimeout(() => {
            exit();
          }, 100);
        }
      }
    }

    void fetchData();
    return () => {
      mounted = false;
    };
  }, [exit]);

  return {
    projects,
    loading,
    error,
  };
}

export function ListProjectsUI() {
  const { projects, loading, error } = useProjects();

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Box>
        <Text>
          Found{" "}
          <Text bold color="cyan">
            {projects.length}
          </Text>{" "}
          project{projects.length === 1 ? "" : "s"}
        </Text>
      </Box>

      {projects.length > 0 ? (
        <Box flexDirection="column">
          <Text>{"─".repeat(54)}</Text>
          <Box paddingLeft={1}>
            <Text bold>
              <Text color="cyan">{"NAME".padEnd(30)}</Text>
              <Text color="cyan">{"UPDATED AT"}</Text>
            </Text>
          </Box>
          <Text>{"─".repeat(54)}</Text>

          <Box flexDirection="column">
            {projects.map((project) => (
              <Box key={project.id} paddingLeft={1}>
                <Text>
                  <Text color="green">{project.name.padEnd(30)}</Text>
                  <Text dimColor>
                    {new Date(project.updatedAt)
                      .toLocaleString(undefined, {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                      .replace(/,/, "")}
                  </Text>
                </Text>
              </Box>
            ))}
          </Box>
          <Text>{"─".repeat(54)}</Text>
        </Box>
      ) : (
        <Box>
          <Text dimColor>No projects found</Text>
        </Box>
      )}
    </Box>
  );
}
