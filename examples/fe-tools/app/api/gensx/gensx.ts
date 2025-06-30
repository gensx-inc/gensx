export const GENSX_WORKFLOW_NAME = "MapAgent";

export const GENSX_ORG = process.env.GENSX_ORG;
export const GENSX_PROJECT = process.env.GENSX_PROJECT ?? "frontend-tools";
export const GENSX_ENV = process.env.GENSX_ENV ?? "default";

export const shouldUseLocalDevServer = () => {
  if (
    process.env.GENSX_BASE_URL &&
    (!process.env.GENSX_BASE_URL.includes("localhost") ||
      process.env.USE_LOCAL_DEV_SERVER === "false")
  ) {
    return false;
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV) {
    return false;
  }
  return true;
};
