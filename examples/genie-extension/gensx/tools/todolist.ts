import { z } from "zod";
import { tool } from "ai";
import * as gensx from "@gensx/core";

export function createTodoList(initialTodoList: {
  items: { title: string; completed: boolean }[];
}) {
  const todoList = { ...initialTodoList };

  return {
    tools: {
      addTodoItems: tool({
        description: "Add one or more new todo items to the list",
        parameters: z.object({
          items: z
            .array(
              z.object({
                title: z.string().describe("The title of the todo item"),
                index: z
                  .number()
                  .describe(
                    "The index position to insert the item at. If omitted, the item will be added to the end of the list.",
                  )
                  .optional(),
              }),
            )
            .describe("The items to add to the todo list"),
        }),
        execute: async (params: {
          items: { title: string; index?: number }[];
        }) => {
          const { items } = params;
          items.forEach((item) => {
            todoList.items.splice(item.index ?? todoList.items.length, 0, {
              title: item.title,
              completed: false,
            });
          });

          gensx.publishObject("todoList", todoList);
          return {
            success: true,
            items: todoList.items.map((item, index) => ({ ...item, index })),
          };
        },
      }),
      completeTodoItems: tool({
        description: "Mark a todo item as completed",
        parameters: z.object({
          items: z
            .array(
              z.object({
                index: z
                  .number()
                  .describe(
                    "The index of the todo item to complete. If omitted, the top-most non-completed item will be completed.",
                  ),
              }),
            )
            .describe(
              "The items to complete. If omitted, the top-most non-completed item will be completed.",
            )
            .optional(),
        }),
        execute: async (params: { items?: { index: number }[] }) => {
          const { items } = params;

          if (items) {
            items.forEach((item) => {
              todoList.items[item.index].completed = true;
            });
          } else {
            const index = todoList.items.findIndex((item) => !item.completed);
            todoList.items[index].completed = true;
          }

          gensx.publishObject("todoList", todoList);
          return {
            success: true,
            items: todoList.items.map((item, index) => ({ ...item, index })),
          };
        },
      }),
      removeTodoItems: tool({
        description: "Remove a todo item from the list",
        parameters: z.object({
          items: z
            .array(
              z.object({
                index: z
                  .number()
                  .describe("The index of the todo item to remove"),
              }),
            )
            .describe(
              "The items to remove. If omitted, the top-most item will be removed.",
            ),
        }),
        execute: async (params: { items: { index: number }[] }) => {
          const { items } = params;

          items.forEach((item) => {
            todoList.items.splice(item.index, 1);
          });

          gensx.publishObject("todoList", todoList);
          return {
            success: true,
            items: todoList.items.map((item, index) => ({ ...item, index })),
          };
        },
      }),
      getTodoList: tool({
        description: "Get the current todo list",
        parameters: z.object({}),
        execute: async () => {
          return {
            items: todoList.items.map((item, index) => ({ ...item, index })),
          };
        },
      }),
      clearTodoList: tool({
        description: "Clear the todo list",
        parameters: z.object({}),
        execute: async () => {
          todoList.items = [];
          gensx.publishObject("todoList", todoList);
          return { success: true, items: [] };
        },
      }),
    },
    getFinalTodoList: () => todoList,
  };
}
