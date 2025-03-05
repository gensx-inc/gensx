import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["avatars.githubusercontent.com"], // Allow GitHub avatar images
  },
};

export default nextConfig;
