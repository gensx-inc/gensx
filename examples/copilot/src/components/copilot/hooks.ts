import { useLocalStorage } from "usehooks-ts";

export const useCopilotUserId = () => {
  return useLocalStorage("gensx-copilot-user-id", crypto.randomUUID(), {
    initializeWithValue: typeof window !== 'undefined'
  });
};

export const useCopilotThreadId = () => {
  return useLocalStorage("gensx-copilot-thread-id", Date.now().toString(), {
    initializeWithValue: typeof window !== 'undefined'
  });
};
