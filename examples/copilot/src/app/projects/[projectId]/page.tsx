"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import TodoListView from "@/components/TodoListView";
import { getUserId } from "@/lib/get-user-id";
import { findBySlugOrId, slugify } from "@/lib/slugify";
import {
  getTodoData,
  createTodoList,
  deleteTodoList,
  type Project,
  type TodoList,
  type AppData,
} from "@/actions/todo-data";

export default function ProjectDetailPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [appData, setAppData] = useState<AppData>({
    projects: [],
    todoLists: [],
    todos: [],
  });
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const projectSlug = params.projectId as string;

  useEffect(() => {
    const initializeData = async () => {
      const currentUserId = getUserId();
      setUserId(currentUserId);
      
      if (currentUserId) {
        const data = await getTodoData(currentUserId);
        setAppData(data);
        
        // Find the project by slug or ID
        const foundProject = findBySlugOrId(data.projects, projectSlug);
        if (foundProject) {
          setProject(foundProject);
        } else {
          // Project not found, redirect to projects
          router.push('/projects');
          return;
        }
      }
      setLoading(false);
    };

    initializeData();
  }, [projectSlug, router]);

  const refreshData = async () => {
    if (userId) {
      const data = await getTodoData(userId);
      setAppData(data);
      
      // Update project reference
      const foundProject = findBySlugOrId(data.projects, projectSlug);
      if (foundProject) {
        setProject(foundProject);
      }
    }
  };

  const handleCreateTodoList = async (projectId: string, name: string, description?: string) => {
    if (!userId) return;
    await createTodoList(userId, projectId, name, description);
    await refreshData();
  };

  const handleDeleteTodoList = async (listId: string) => {
    if (!userId) return;
    await deleteTodoList(userId, listId);
    await refreshData();
  };

  const handleSelectTodoList = (todoList: TodoList) => {
    if (project) {
      const projectSlug = slugify(project.name);
      const listSlug = slugify(todoList.name);
      router.push(`/projects/${projectSlug}/lists/${listSlug}`);
    }
  };

  const handleBack = () => {
    router.push('/projects');
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

  if (!project) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Project not found</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const projectTodoLists = project ? appData.todoLists.filter(list => list.projectId === project.id) : [];

  return (
    <TodoListView
      project={project}
      todoLists={projectTodoLists}
      todos={appData.todos}
      onCreateTodoList={handleCreateTodoList}
      onDeleteTodoList={handleDeleteTodoList}
      onSelectTodoList={handleSelectTodoList}
      onBack={handleBack}
    />
  );
}