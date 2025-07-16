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
        source: "/demos/draft-pad/:file.svg",
        destination: `${DRAFT_PAD_URL}/:file.svg`,
      },
      {
        source: "/demos/draft-pad/:file.png",
        destination: `${DRAFT_PAD_URL}/:file.png`,
      },
      {
        source: "/demos/draft-pad/:file.ico",
        destination: `${DRAFT_PAD_URL}/:file.ico`,
      },
      {
        source: "/demos/draft-pad/:file.jpg",
        destination: `${DRAFT_PAD_URL}/:file.jpg`,
      },
      {
        source: "/demos/draft-pad/:file.jpeg",
        destination: `${DRAFT_PAD_URL}/:file.jpeg`,
      },
      {
        source: "/demos/draft-pad/:file.gif",
        destination: `${DRAFT_PAD_URL}/:file.gif`,
      },
      {
        source: "/demos/draft-pad/:file.webp",
        destination: `${DRAFT_PAD_URL}/:file.webp`,
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
        source: "/:file.svg",
        destination: `${DRAFT_PAD_URL}/:file.svg`,
        has: [
          {
            type: "header",
            key: "referer",
            value: ".*demos/draft-pad.*",
          },
        ],
      },
      {
        source: "/:file.png",
        destination: `${DRAFT_PAD_URL}/:file.png`,
        has: [
          {
            type: "header",
            key: "referer",
            value: ".*demos/draft-pad.*",
          },
        ],
      },
      {
        source: "/:file.ico",
        destination: `${DRAFT_PAD_URL}/:file.ico`,
        has: [
          {
            type: "header",
            key: "referer",
            value: ".*demos/draft-pad.*",
          },
        ],
      },
      {
        source: "/:file.jpg",
        destination: `${DRAFT_PAD_URL}/:file.jpg`,
        has: [
          {
            type: "header",
            key: "referer",
            value: ".*demos/draft-pad.*",
          },
        ],
      },
      {
        source: "/:file.jpeg",
        destination: `${DRAFT_PAD_URL}/:file.jpeg`,
        has: [
          {
            type: "header",
            key: "referer",
            value: ".*demos/draft-pad.*",
          },
        ],
      },
      {
        source: "/:file.gif",
        destination: `${DRAFT_PAD_URL}/:file.gif`,
        has: [
          {
            type: "header",
            key: "referer",
            value: ".*demos/draft-pad.*",
          },
        ],
      },
      {
        source: "/:file.webp",
        destination: `${DRAFT_PAD_URL}/:file.webp`,
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
