/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://gensx.com",
  generateRobotsTxt: true,
  exclude: ["/blog/_*"],
  additionalPaths: async () => {
    return [
      { loc: "/llms.txt", changefreq: "daily", priority: 0.7 },
      { loc: "/llms-full.txt", changefreq: "daily", priority: 0.7 },
    ];
  },
  robotsTxtOptions: {
    additionalSitemaps: ["https://gensx.com/docs/sitemap.xml"],
  },
};
