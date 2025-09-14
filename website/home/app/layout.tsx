import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { GridPatternDemo } from "@/components/ui/grid-pattern";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@next/third-parties/google";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: "GenSX",
  description: "Build agents and workflows with with React-like components",
  metadataBase: new URL("https://gensx.com"),
  openGraph: {
    title: "GenSX - Build Agents with React Components",
    description: "Build agents and workflows with with React-like components",
    url: "https://gensx.com",
    siteName: "GenSX",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GenSX - Build Agents with React Components"
      }
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GenSX - Build Agents with React Components",
    description: "Build agents and workflows with with React-like components",
    creator: "@gensx_inc",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${figtree.variable} antialiased relative min-h-screen bg-background flex flex-col`}
      >
        <GridPatternDemo />
        <Nav />
        <main className="flex-grow">{children}</main>
        <Footer />
        <Analytics />
      </body>
      <GoogleAnalytics gaId="G-PMQF1NV33L" />
    </html>
  );
}
