export const GENSX_WORKFLOW_NAME = "MapAgent";

export const GENSX_ORG = process.env.GENSX_ORG;
export const GENSX_PROJECT = process.env.GENSX_PROJECT ?? "client-side-tools";
export const GENSX_ENV = process.env.GENSX_ENV ?? "default";

export const shouldUseLocalDevServer = () => {
  if (
    process.env.USE_LOCAL_DEV_SERVER === "false" ||
    (process.env.GENSX_BASE_URL &&
      !process.env.GENSX_BASE_URL.includes("localhost"))
  ) {
    return false;
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV) {
    return false;
  }
  return true;
};
