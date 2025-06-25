export async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const clonedResponse = response.clone();
    const data = (await clonedResponse.json()) as { error?: string };
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {
    // Ignore JSON parse errors
  }
  return response.statusText || `HTTP ${response.status}`;
}
