// const isDev = process.env.NODE_ENV === "development";

const DOCS_URL = process.env.DOCS_URL || "http://localhost:4000";
const DRAFT_PAD_URL = process.env.DRAFT_PAD_URL || "http://localhost:3100";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Draft pad API routes - handle before general routes
      {
        source: "/demos/draft-pad/api/:path*",
        destination: `${DRAFT_PAD_URL}/api/:path*`,
      },
      // Draft pad public assets - more comprehensive handling
      {
        source: "/demos/draft-pad/gensx-logo.svg",
        destination: `${DRAFT_PAD_URL}/gensx-logo.svg`,
      },
      {
        source: "/demos/draft-pad/background-mountains-window.png",
        destination: `${DRAFT_PAD_URL}/background-mountains-window.png`,
      },
      {
        source: "/demos/draft-pad/:file.(svg|png|ico|jpg|jpeg|gif|webp)",
        destination: `${DRAFT_PAD_URL}/:file.(svg|png|ico|jpg|jpeg|gif|webp)`,
      },
      // Handle root-level public assets that the draft-pad might request
      {
        source: "/gensx-logo.svg",
        destination: `${DRAFT_PAD_URL}/gensx-logo.svg`,
        has: [
          {
            type: "header",
            key: "referer",
            value: ".*demos/draft-pad.*",
          },
        ],
      },
      {
        source: "/background-mountains-window.png",
        destination: `${DRAFT_PAD_URL}/background-mountains-window.png`,
        has: [
          {
            type: "header",
            key: "referer",
            value: ".*demos/draft-pad.*",
          },
        ],
      },
      {
        source: "/:file.(svg|png|ico|jpg|jpeg|gif|webp)",
        destination: `${DRAFT_PAD_URL}/:file.(svg|png|ico|jpg|jpeg|gif|webp)`,
        has: [
          {
            type: "header",
            key: "referer",
            value: ".*demos/draft-pad.*",
          },
        ],
      },
      // Draft pad routes - catch all other routes
      {
        source: "/demos/draft-pad/:path*",
        destination: `${DRAFT_PAD_URL}/:path*`,
      },
      {
        source: "/demos/draft-pad",
        destination: `${DRAFT_PAD_URL}/`,
      },
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
