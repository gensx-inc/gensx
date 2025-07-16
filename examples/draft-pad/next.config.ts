import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // For development, we need to handle the proxy scenario
  assetPrefix: isDevelopment ? "/demos/draft-pad" : "/demos/draft-pad",
  basePath: "",
  trailingSlash: false,
};

export default nextConfig;
