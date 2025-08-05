import { z } from "zod";
import { tool } from "ai";
import * as gensx from "@gensx/core";

export function createTodoList(initialTodoList: {
  items: { title: string; completed: boolean }[];
}) {
  const todoList = { ...initialTodoList };

  return {
    tools: {
      addTodoItem: tool({
        description: "Add a new todo item to the list",
        parameters: z.object({
          title: z.string().describe("The title of the todo item"),
          index: z.number().describe("The index position to insert the item at. If omitted, the item will be added to the end of the list.").optional(),
        }),
        execute: async (params: { title: string, index?: number }) => {
          const { title, index } = params;
          todoList.items.splice(index ?? todoList.items.length, 0, { title, completed: false });

          gensx.publishObject("todoList", todoList);
          return { success: true, items: todoList.items.map((item, index) => ({ ...item, index })) };
        },
      }),
      completeTodoItem: tool({
        description: "Mark a todo item as completed",
        parameters: z.object({
          index: z.number().describe("The index of the todo item to complete. If omitted, the top-most non-completed item will be completed.").optional(),
        }),
        execute: async (params: { index?: number }) => {
          const index = params.index ?? todoList.items.findIndex(item => !item.completed);
          todoList.items[index].completed = true;
          gensx.publishObject("todoList", todoList);
          return { success: true, items: todoList.items.map((item, index) => ({ ...item, index })) };
        },
      }),
      removeTodoItem: tool({
        description: "Remove a todo item from the list",
        parameters: z.object({
          index: z.number().describe("The index of the todo item to remove"),
        }),
        execute: async (params: { index: number }) => {
          todoList.items.splice(params.index, 1);
          gensx.publishObject("todoList", todoList);
          return { success: true, items: todoList.items.map((item, index) => ({ ...item, index })) };
        },
      }),
      getTodoList: tool({
        description: "Get the current todo list",
        parameters: z.object({}),
        execute: async () => {
          return { items: todoList.items.map((item, index) => ({ ...item, index })) };
        },
      }),
    },
    getFinalTodoList: () => todoList,
  };
}
