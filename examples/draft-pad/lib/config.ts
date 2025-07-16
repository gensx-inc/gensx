// Configuration utility for handling different deployment scenarios

/**
 * Get the base path for API calls.
 * In development: checks if we're running through a proxy (based on pathname)
 * In production: could be configured via environment variables
 */
export function getApiBasePath(): string {
  // Check if we're running in the browser
  if (typeof window !== "undefined") {
    const pathname = window.location.pathname;

    // If we're accessing through /demos/draft-pad, use that as base
    if (pathname.startsWith("/demos/draft-pad")) {
      return "/demos/draft-pad";
    }
  }

  // Default to root (standalone mode)
  return "";
}

/**
 * Get the full API URL for a given endpoint
 */
export function getApiUrl(endpoint: string): string {
  const basePath = getApiBasePath();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${basePath}${cleanEndpoint}`;
}
