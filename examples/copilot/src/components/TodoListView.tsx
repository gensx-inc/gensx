"use client";

import React, { useState } from "react";
import type { Project, TodoList, Todo } from "../actions/todo-data";

interface TodoListViewProps {
  project: Project;
  todoLists: TodoList[];
  todos: Todo[];
  onCreateTodoList: (projectId: string, name: string, description?: string) => Promise<void>;
  onDeleteTodoList: (listId: string) => Promise<void>;
  onSelectTodoList: (todoList: TodoList) => void;
  onBack: () => void;
}

export default function TodoListView({
  project,
  todoLists,
  todos,
  onCreateTodoList,
  onDeleteTodoList,
  onSelectTodoList,
  onBack,
}: TodoListViewProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTodoList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await onCreateTodoList(
        project.id,
        newListName.trim(),
        newListDescription.trim() || undefined,
      );
      setNewListName("");
      setNewListDescription("");
      setShowCreateForm(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (confirm("Are you sure you want to delete this todo list? This will also delete all its todos.")) {
      await onDeleteTodoList(listId);
    }
  };

  const getTodosForList = (listId: string) => {
    return todos.filter(todo => todo.listId === listId);
  };

  const getListStats = (listId: string) => {
    const listTodos = getTodosForList(listId);
    const completed = listTodos.filter(t => t.completed).length;
    return { total: listTodos.length, completed };
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            id="back-to-projects"
          >
            ← Back to Projects
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600">{project.description}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          id="create-todolist-button"
        >
          {showCreateForm ? "Cancel" : "New Todo List"}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateTodoList} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-4">
            <div>
              <label htmlFor="todolist-name" className="block text-sm font-medium text-gray-700 mb-1">
                Todo List Name
              </label>
              <input
                type="text"
                id="todolist-name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Enter todo list name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="todolist-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                id="todolist-description"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="Enter todo list description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? "Creating..." : "Create Todo List"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {todoLists.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No todo lists yet.</p>
          <p className="text-sm text-gray-400">Create your first todo list to get started!</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {todoLists.map((todoList) => {
            const stats = getListStats(todoList.id);
            return (
              <div
                key={todoList.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer todolist-card"
                data-todolist-id={todoList.id}
                onClick={() => onSelectTodoList(todoList)}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 todolist-name">
                    {todoList.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteList(todoList.id);
                    }}
                    className="text-red-500 hover:text-red-700 p-1 todolist-delete"
                    aria-label="Delete todo list"
                  >
                    ✕
                  </button>
                </div>
                
                {todoList.description && (
                  <p className="text-gray-600 text-sm mb-3 todolist-description">
                    {todoList.description}
                  </p>
                )}

                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{stats.completed}/{stats.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: stats.total > 0 ? `${(stats.completed / stats.total) * 100}%` : '0%' 
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {getTodosForList(todoList.id).slice(0, 5).map((todo) => (
                    <div
                      key={todo.id}
                      className={`text-sm p-2 rounded ${
                        todo.completed ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span className={todo.completed ? "line-through" : ""}>
                        {todo.text}
                      </span>
                    </div>
                  ))}
                  {getTodosForList(todoList.id).length > 5 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{getTodosForList(todoList.id).length - 5} more...
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                  Created: {new Date(todoList.createdAt).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}