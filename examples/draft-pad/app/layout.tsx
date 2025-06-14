import type { Metadata } from "next";
import { Atma, Figtree, Funnel_Sans, Meow_Script } from "next/font/google";
import "./globals.css";



const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const atma = Atma({
  variable: "--font-atma",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const meow = Meow_Script({
  variable: "--font-meow-script",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Draft Pad",
  description: "Draft Pad",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${figtree.variable} ${atma.variable} ${meow.variable} antialiased`}
      >
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: 'url(/background-nature.png)' }}
          />
          <div className="absolute inset-0" />
        </div>
        <div className="relative z-10 h-screen flex flex-col overflow-hidden">
          <div className="flex-1 p-4 flex overflow-hidden">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
