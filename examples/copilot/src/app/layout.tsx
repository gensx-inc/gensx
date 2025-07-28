import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import GenSXCopilot from "@/components/copilot/GenSXCopilot";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GenSX Copilot Demo",
  description: "Demo showcasing GenSX Copilot with project and todo management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div id="main-content" className="min-h-screen bg-gray-50 py-12 px-4 transition-all duration-300">
          <div className="max-w-6xl mx-auto">
            <header className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                GenSX Copilot Demo
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                This demo showcases the GenSX Copilot component that can
                interact with web pages using jQuery-based introspection tools.
                Try asking the copilot to interact with the project and todo
                management system!
              </p>
            </header>

            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  Try These Commands:
                </h2>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    &quot;Show me what&apos;s on this page&quot;
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    &quot;Create a new project called &apos;My Work
                    Project&apos;&quot;
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    &quot;Click on the first project to view its todo
                    lists&quot;
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    &quot;Create a new todo list called &apos;Daily
                    Tasks&apos;&quot;
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    &quot;Add a new todo item called &apos;Test GenSX
                    Copilot&apos;&quot;
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    &quot;Complete the first todo in the list&quot;
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    &quot;Go back to the projects view&quot;
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    &quot;Go back to the previous page&quot;
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    &quot;Navigate forward in browser history&quot;
                  </li>
                </ul>
              </div>

              <div className="md:col-span-2">{children}</div>
            </div>

            <div className="mt-12 p-6 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                How It Works
              </h3>
              <p className="text-gray-700 mb-2">
                The GenSX Copilot uses jQuery-based tools to inspect and
                interact with the DOM. The AI can see page structure, click
                elements, fill forms, navigate between views, and manage
                projects and todo lists.
              </p>
            </div>
          </div>

          <Suspense fallback={null}>
            <GenSXCopilot />
          </Suspense>
        </div>
      </body>
    </html>
  );
}
