import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config: any) => {
    // Ignore @libsql/client package
    config.resolve.alias = {
      ...config.resolve.alias,
      "@libsql/client": false,
    };
    return config;
  },
};

export default nextConfig;
