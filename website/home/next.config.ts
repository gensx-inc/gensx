const DOCS_URL = process.env.DOCS_URL || "http://localhost:4000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    parserOptions: {
      moduleResolution: "node16",
    },
  },
  async rewrites() {
    return [
      {
        source: "/docs",
        destination: `${DOCS_URL}/docs`,
      },
      {
        source: "/docs/:path+",
        destination: `${DOCS_URL}/docs/:path+`,
      },
      {
        source: "/docs-static/_next/:path+",
        destination: `${DOCS_URL}/docs-static/_next/:path+`,
      },
    ];
  },
};

module.exports = nextConfig;
