"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProjectList from "@/components/ProjectList";
import { getUserId } from "@/lib/get-user-id";
import { slugify } from "@/lib/slugify";
import {
  getTodoData,
  createProject,
  deleteProject,
  type Project,
  type AppData,
} from "@/actions/todo-data";

export default function ProjectsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [appData, setAppData] = useState<AppData>({
    projects: [],
    todoLists: [],
    todos: [],
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeData = async () => {
      const currentUserId = getUserId();
      setUserId(currentUserId);
      
      if (currentUserId) {
        const data = await getTodoData(currentUserId);
        setAppData(data);
      }
      setLoading(false);
    };

    initializeData();
  }, []);

  const refreshData = async () => {
    if (userId) {
      const data = await getTodoData(userId);
      setAppData(data);
    }
  };

  const handleCreateProject = async (name: string, description?: string) => {
    if (!userId) return;
    await createProject(userId, name, description);
    await refreshData();
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!userId) return;
    await deleteProject(userId, projectId);
    await refreshData();
  };

  const handleSelectProject = (project: Project) => {
    const projectSlug = slugify(project.name);
    router.push(`/projects/${projectSlug}`);
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ProjectList
      projects={appData.projects}
      onCreateProject={handleCreateProject}
      onDeleteProject={handleDeleteProject}
      onSelectProject={handleSelectProject}
    />
  );
}