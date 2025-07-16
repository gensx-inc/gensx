/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: any) => {
    // Ignore @libsql/client package
    config.resolve.alias = {
      ...config.resolve.alias,
      "@libsql/client": false,
    };
    return config;
  },
};

module.exports = nextConfig;
