"use client";

import React, { useState } from "react";
import type { Project, TodoList, Todo } from "../actions/todo-data";

interface SingleTodoListProps {
  project: Project;
  todoList: TodoList;
  todos: Todo[];
  onCreateTodo: (listId: string, text: string) => Promise<void>;
  onUpdateTodo: (todoId: string, updates: Partial<Pick<Todo, "text" | "completed">>) => Promise<void>;
  onDeleteTodo: (todoId: string) => Promise<void>;
  onBack: () => void;
}

export default function SingleTodoList({
  project,
  todoList,
  todos,
  onCreateTodo,
  onUpdateTodo,
  onDeleteTodo,
  onBack,
}: SingleTodoListProps) {
  const [newTodoText, setNewTodoText] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingTodo, setEditingTodo] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await onCreateTodo(todoList.id, newTodoText.trim());
      setNewTodoText("");
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleTodo = async (todoId: string, completed: boolean) => {
    await onUpdateTodo(todoId, { completed: !completed });
  };

  const handleStartEdit = (todo: Todo) => {
    setEditingTodo(todo.id);
    setEditText(todo.text);
  };

  const handleSaveEdit = async (todoId: string) => {
    if (editText.trim()) {
      await onUpdateTodo(todoId, { text: editText.trim() });
    }
    setEditingTodo(null);
    setEditText("");
  };

  const handleCancelEdit = () => {
    setEditingTodo(null);
    setEditText("");
  };

  const handleDeleteTodo = async (todoId: string) => {
    if (confirm("Are you sure you want to delete this todo?")) {
      await onDeleteTodo(todoId);
    }
  };

  const completedTodos = todos.filter(t => t.completed);
  const incompleteTodos = todos.filter(t => !t.completed);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            id="back-to-project"
          >
            ← Back to {project.name}
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{todoList.name}</h1>
            {todoList.description && (
              <p className="text-gray-600">{todoList.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{completedTodos.length}/{todos.length} completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-500 h-3 rounded-full transition-all duration-300"
            style={{ 
              width: todos.length > 0 ? `${(completedTodos.length / todos.length) * 100}%` : '0%' 
            }}
          />
        </div>
      </div>

      {/* Add new todo form */}
      <form onSubmit={handleCreateTodo} className="mb-6 todo-form">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            placeholder="Add a new todo..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            id="todo-input"
            disabled={isCreating}
          />
          <button
            type="submit"
            disabled={isCreating}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            id="add-todo-button"
          >
            {isCreating ? "Adding..." : "Add"}
          </button>
        </div>
      </form>

      {/* Todos list */}
      <div className="space-y-4">
        {/* Incomplete todos */}
        {incompleteTodos.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              To Do ({incompleteTodos.length})
            </h3>
            <ul className="space-y-2 todo-list">
              {incompleteTodos.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors todo-item"
                  data-todo-id={todo.id}
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => handleToggleTodo(todo.id, todo.completed)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 todo-checkbox"
                    id={`todo-checkbox-${todo.id}`}
                  />
                  
                  {editingTodo === todo.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSaveEdit(todo.id);
                          } else if (e.key === "Escape") {
                            handleCancelEdit();
                          }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(todo.id)}
                        className="px-2 py-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Save"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        className="flex-1 text-gray-800 todo-text cursor-pointer"
                        onClick={() => handleStartEdit(todo)}
                      >
                        {todo.text}
                      </span>
                      <button
                        onClick={() => handleStartEdit(todo)}
                        className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors todo-edit"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors todo-delete"
                        aria-label="Delete todo"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Completed todos */}
        {completedTodos.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Completed ({completedTodos.length})
            </h3>
            <ul className="space-y-2 completed-todo-list">
              {completedTodos.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-center gap-3 p-3 bg-green-50 rounded-md hover:bg-green-100 transition-colors todo-item completed-todo-item"
                  data-todo-id={todo.id}
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => handleToggleTodo(todo.id, todo.completed)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500 todo-checkbox"
                    id={`todo-checkbox-${todo.id}`}
                  />
                  
                  {editingTodo === todo.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSaveEdit(todo.id);
                          } else if (e.key === "Escape") {
                            handleCancelEdit();
                          }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(todo.id)}
                        className="px-2 py-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                        title="Save"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        className="flex-1 text-gray-600 line-through todo-text cursor-pointer"
                        onClick={() => handleStartEdit(todo)}
                      >
                        {todo.text}
                      </span>
                      <button
                        onClick={() => handleStartEdit(todo)}
                        className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors todo-edit"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors todo-delete"
                        aria-label="Delete todo"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {todos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No todos yet.</p>
            <p className="text-sm text-gray-400">Add your first todo above!</p>
          </div>
        )}
      </div>

      {/* Summary */}
      {todos.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Total: {todos.length} | Completed: {completedTodos.length} | Remaining: {incompleteTodos.length}
          </p>
        </div>
      )}
    </div>
  );
}