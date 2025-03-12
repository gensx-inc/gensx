/* eslint-env node */
import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";

import "nextra-theme-docs/style.css";
import "./globals.css";
import { Figtree } from "next/font/google";
import Logo from "./components/Logo";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@next/third-parties/google";

export const metadata = {
  metadataBase: new URL("https://gensx.com/docs"),
  title: {
    template: "%s - GenSX",
  },
  description: "GenSX: the framework for building TS LLM applications",
  applicationName: "GenSX",
  generator: "Next.js",
  appleWebApp: {
    title: "GenSX",
  },
  twitter: {
    site: "https://gensx.com",
  },
};

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

export default async function RootLayout({ children }) {
  const navbar = (
    <Navbar
      logo={<Logo />}
      logoLink="/docs"
      // GenSX discord server.
      chatLink="https://discord.gg/wRmwfz5tCy"
      projectLink="https://github.com/gensx-inc/gensx"
    />
  );
  const pageMap = await getPageMap("/docs");
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body className={`${figtree.variable}`}>
        <Layout
          navbar={navbar}
          footer={
            <Footer>Apache 2.0 {new Date().getFullYear()} © GenSX.</Footer>
          }
          editLink="Edit this page on GitHub"
          docsRepositoryBase="https://github.com/gensx-inc/gensx/blob/main/website/docs"
          sidebar={{ defaultMenuCollapseLevel: 2 }}
          pageMap={pageMap}
        >
          {children}
        </Layout>
        <Analytics />
      </body>
      <GoogleAnalytics gaId="G-PMQF1NV33L" />
    </html>
  );
}
