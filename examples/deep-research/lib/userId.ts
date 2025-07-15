const USER_ID_KEY = "gensx-user-id";

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
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }

  return userId;
}

export function clearUserId(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_ID_KEY);
  }
}
