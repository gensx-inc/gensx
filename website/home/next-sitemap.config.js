/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://gensx.com",
  generateRobotsTxt: true,
  exclude: ["/blog/_*"],
  robotsTxtOptions: {
    additionalSitemaps: ["https://gensx.com/docs/sitemap.xml"],
  },
};
