import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // For development, we need to handle the proxy scenario
  assetPrefix: "/demos/draft-pad",
  basePath: "",
  trailingSlash: false,
};

export default nextConfig;
