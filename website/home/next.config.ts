// const isDev = process.env.NODE_ENV === "development";

const DOCS_URL = process.env.DOCS_URL || "http://localhost:4000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Docs routes
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
      {
        source: "/_pagefind/:path*",
        destination: `${DOCS_URL}/_pagefind/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/demos/draft-pad/:path*",
        destination: "https://draft-pad.vercel.app/:path*",
        permanent: false,
      },
      {
        source: "/demos/draft-pad",
        destination: "https://draft-pad.vercel.app",
        permanent: false,
      },
      {
        source: "/overview",
        destination: `/docs`,
        permanent: false,
      },
      {
        source: "/docs/why-jsx",
        destination: "/docs/why-components",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
