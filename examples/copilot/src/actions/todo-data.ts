"use server";

import { BlobClient } from "@gensx/storage";

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TodoList {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Todo {
  id: string;
  listId: string;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  projects: Project[];
  todoLists: TodoList[];
  todos: Todo[];
}

function shouldUseLocalDevServer(): boolean {
  return process.env.NODE_ENV === "development";
}

export async function getTodoData(userId: string): Promise<AppData> {
  try {
    const blobClient = new BlobClient({
      kind: shouldUseLocalDevServer() ? "filesystem" : "cloud",
    });

    const blobPath = `todo-data/${userId}/data.json`;
    const blob = await blobClient.getBlob<AppData>(blobPath);

    const exists = await blob.exists();
    if (!exists) {
      // Create initial sample data for first-time users
      const sampleData: AppData = {
        projects: [
          {
            id: "1",
            name: "GenSX Learning",
            description: "Learning and experimenting with GenSX framework",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "2",
            name: "Personal Tasks",
            description: "Daily personal todo items",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        todoLists: [
          {
            id: "1",
            projectId: "1",
            name: "Getting Started",
            description: "Essential tasks to get familiar with GenSX",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "2",
            projectId: "1",
            name: "Advanced Features",
            description: "Exploring more complex GenSX capabilities",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "3",
            projectId: "2",
            name: "Daily Routine",
            description: "Things to do every day",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        todos: [
          {
            id: "1",
            listId: "1",
            text: "Learn GenSX basic concepts",
            completed: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "2",
            listId: "1",
            text: "Build a copilot application",
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "3",
            listId: "1",
            text: "Test jQuery tools integration",
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "4",
            listId: "2",
            text: "Implement complex workflows",
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "5",
            listId: "2",
            text: "Add data persistence",
            completed: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "6",
            listId: "3",
            text: "Check emails",
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "7",
            listId: "3",
            text: "Plan the day",
            completed: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      // Save the sample data
      await blob.putJSON(sampleData);
      return sampleData;
    }

    const data = await blob.getJSON();
    return data || { projects: [], todoLists: [], todos: [] };
  } catch (error) {
    console.error("Error reading todo data:", error);
    return { projects: [], todoLists: [], todos: [] };
  }
}

export async function saveTodoData(
  userId: string,
  data: AppData,
): Promise<void> {
  try {
    const blobClient = new BlobClient({
      kind: shouldUseLocalDevServer() ? "filesystem" : "cloud",
    });

    const blobPath = `todo-data/${userId}/data.json`;
    const blob = await blobClient.getBlob<AppData>(blobPath);

    await blob.putJSON(data);
  } catch (error) {
    console.error("Error saving todo data:", error);
    throw new Error("Failed to save todo data");
  }
}

export async function createProject(
  userId: string,
  name: string,
  description?: string,
): Promise<Project> {
  const data = await getTodoData(userId);

  const newProject: Project = {
    id: Date.now().toString(),
    name,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.projects.push(newProject);
  await saveTodoData(userId, data);

  return newProject;
}

export async function updateProject(
  userId: string,
  projectId: string,
  updates: Partial<Pick<Project, "name" | "description">>,
): Promise<Project | null> {
  const data = await getTodoData(userId);

  const projectIndex = data.projects.findIndex((p) => p.id === projectId);
  if (projectIndex === -1) {
    return null;
  }

  const updatedProject = {
    ...data.projects[projectIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  data.projects[projectIndex] = updatedProject;
  await saveTodoData(userId, data);

  return updatedProject;
}

export async function deleteProject(
  userId: string,
  projectId: string,
): Promise<void> {
  const data = await getTodoData(userId);

  // Remove project
  data.projects = data.projects.filter((p) => p.id !== projectId);

  // Remove associated todo lists
  const listsToRemove = data.todoLists.filter((l) => l.projectId === projectId);
  data.todoLists = data.todoLists.filter((l) => l.projectId !== projectId);

  // Remove todos from deleted lists
  const listIdsToRemove = listsToRemove.map((l) => l.id);
  data.todos = data.todos.filter((t) => !listIdsToRemove.includes(t.listId));

  await saveTodoData(userId, data);
}

export async function createTodoList(
  userId: string,
  projectId: string,
  name: string,
  description?: string,
): Promise<TodoList> {
  const data = await getTodoData(userId);

  const newTodoList: TodoList = {
    id: Date.now().toString(),
    projectId,
    name,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.todoLists.push(newTodoList);
  await saveTodoData(userId, data);

  return newTodoList;
}

export async function updateTodoList(
  userId: string,
  listId: string,
  updates: Partial<Pick<TodoList, "name" | "description">>,
): Promise<TodoList | null> {
  const data = await getTodoData(userId);

  const listIndex = data.todoLists.findIndex((l) => l.id === listId);
  if (listIndex === -1) {
    return null;
  }

  const updatedList = {
    ...data.todoLists[listIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  data.todoLists[listIndex] = updatedList;
  await saveTodoData(userId, data);

  return updatedList;
}

export async function deleteTodoList(
  userId: string,
  listId: string,
): Promise<void> {
  const data = await getTodoData(userId);

  // Remove todo list
  data.todoLists = data.todoLists.filter((l) => l.id !== listId);

  // Remove associated todos
  data.todos = data.todos.filter((t) => t.listId !== listId);

  await saveTodoData(userId, data);
}

export async function createTodo(
  userId: string,
  listId: string,
  text: string,
): Promise<Todo> {
  const data = await getTodoData(userId);

  const newTodo: Todo = {
    id: Date.now().toString(),
    listId,
    text,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.todos.push(newTodo);
  await saveTodoData(userId, data);

  return newTodo;
}

export async function updateTodo(
  userId: string,
  todoId: string,
  updates: Partial<Pick<Todo, "text" | "completed">>,
): Promise<Todo | null> {
  const data = await getTodoData(userId);

  const todoIndex = data.todos.findIndex((t) => t.id === todoId);
  if (todoIndex === -1) {
    return null;
  }

  const updatedTodo = {
    ...data.todos[todoIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  data.todos[todoIndex] = updatedTodo;
  await saveTodoData(userId, data);

  return updatedTodo;
}

export async function deleteTodo(
  userId: string,
  todoId: string,
): Promise<void> {
  const data = await getTodoData(userId);

  data.todos = data.todos.filter((t) => t.id !== todoId);

  await saveTodoData(userId, data);
}
