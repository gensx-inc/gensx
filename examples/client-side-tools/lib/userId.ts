const USER_ID_KEY = "map-explorer-user-id";

function generateUUID(): string {
  // Try modern crypto.randomUUID first
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getUserId(): string {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    // Server-side, return a temporary ID that will be replaced client-side
    return "temp-server-id";
  }

  // Try to get existing user ID from localStorage
  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    // Generate a new user ID if none exists
    userId = generateUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }

  return userId;
}

export function clearUserId(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_ID_KEY);
  }
}
