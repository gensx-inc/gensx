// const isDev = process.env.NODE_ENV === "development";

const DOCS_URL = "https://gensx-docs-test.vercel.app";

/** @type {import('next').NextConfig} */
const nextConfig = {
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
