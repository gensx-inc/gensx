import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { GridPatternDemo } from "@/components/ui/grid-pattern";
import Nav from "@/components/nav";
import { Analytics } from "@vercel/analytics/react";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: "GenSX",
  description: "GenSX is a platform for generating and sharing SX designs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${figtree.variable} antialiased relative min-h-screen bg-background`}
      >
        <GridPatternDemo />
        <Nav />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
