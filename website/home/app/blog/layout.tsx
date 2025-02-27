import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GenSX Blog",
  description: "The GenSX Blog - Latest news and updates",
};

export default function BlogLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="bg-white min-h-screen w-full">{children}</div>;
}
