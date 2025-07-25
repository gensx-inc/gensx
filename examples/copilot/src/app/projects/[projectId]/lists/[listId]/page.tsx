"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import SingleTodoList from "@/components/SingleTodoList";
import { getUserId } from "@/lib/get-user-id";
import { findBySlugOrId, slugify } from "@/lib/slugify";
import {
  getTodoData,
  createTodo,
  updateTodo,
  deleteTodo,
  type Project,
  type TodoList,
  type Todo,
  type AppData,
} from "@/actions/todo-data";

export default function TodoListDetailPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [appData, setAppData] = useState<AppData>({
    projects: [],
    todoLists: [],
    todos: [],
  });
  const [project, setProject] = useState<Project | null>(null);
  const [todoList, setTodoList] = useState<TodoList | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const projectSlug = params.projectId as string;
  const listSlug = params.listId as string;

  useEffect(() => {
    const initializeData = async () => {
      const currentUserId = getUserId();
      setUserId(currentUserId);
      
      if (currentUserId) {
        const data = await getTodoData(currentUserId);
        setAppData(data);
        
        // Find the project and todo list by slug or ID
        const foundProject = findBySlugOrId(data.projects, projectSlug);
        const foundTodoList = foundProject ? findBySlugOrId(
          data.todoLists.filter(l => l.projectId === foundProject.id), 
          listSlug
        ) : null;
        
        if (foundProject && foundTodoList) {
          setProject(foundProject);
          setTodoList(foundTodoList);
        } else {
          // Project or list not found, redirect appropriately
          if (foundProject) {
            const projectSlugForRedirect = slugify(foundProject.name);
            router.push(`/projects/${projectSlugForRedirect}`);
          } else {
            router.push('/projects');
          }
          return;
        }
      }
      setLoading(false);
    };

    initializeData();
  }, [projectSlug, listSlug, router]);

  const refreshData = async () => {
    if (userId) {
      const data = await getTodoData(userId);
      setAppData(data);
      
      // Update references
      const foundProject = findBySlugOrId(data.projects, projectSlug);
      const foundTodoList = foundProject ? findBySlugOrId(
        data.todoLists.filter(l => l.projectId === foundProject.id), 
        listSlug
      ) : null;
      
      if (foundProject) setProject(foundProject);
      if (foundTodoList) setTodoList(foundTodoList);
    }
  };

  const handleCreateTodo = async (listId: string, text: string) => {
    if (!userId) return;
    await createTodo(userId, listId, text);
    await refreshData();
  };

  const handleUpdateTodo = async (todoId: string, updates: Partial<Pick<Todo, "text" | "completed">>) => {
    if (!userId) return;
    await updateTodo(userId, todoId, updates);
    await refreshData();
  };

  const handleDeleteTodo = async (todoId: string) => {
    if (!userId) return;
    await deleteTodo(userId, todoId);
    await refreshData();
  };

  const handleBack = () => {
    if (project) {
      const projectSlugForRedirect = slugify(project.name);
      router.push(`/projects/${projectSlugForRedirect}`);
    } else {
      router.push('/projects');
    }
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

  if (!project || !todoList) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Todo list not found</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Back to Project
          </button>
        </div>
      </div>
    );
  }

  const todoListTodos = todoList ? appData.todos.filter(todo => todo.listId === todoList.id) : [];

  return (
    <SingleTodoList
      project={project}
      todoList={todoList}
      todos={todoListTodos}
      onCreateTodo={handleCreateTodo}
      onUpdateTodo={handleUpdateTodo}
      onDeleteTodo={handleDeleteTodo}
      onBack={handleBack}
    />
  );
}