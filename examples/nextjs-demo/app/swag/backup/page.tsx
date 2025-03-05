"use client";

import Image from "next/image";
import Link from "next/link";
import { runGiveawayWorkflow } from "../../actions/runGiveawayWorkflow";
import { useState } from "react";
import type { SwagGiveawayOutput } from "../../actions/runGiveawayWorkflow";

export default function BackupSwagPage() {
  const [result, setResult] = useState<SwagGiveawayOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");

  const handleReset = () => {
    setResult(null);
  };

  const handleRunWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    try {
      const result = await runGiveawayWorkflow(
        {
          prizes: [
            { name: "Hat", probability: 0.15 },
            { name: "Hoodie", probability: 0.1 },
            { name: "T-Shirt", probability: 0.15 },
            { name: "Stickers", probability: 0.4 },
            { name: "Mug", probability: 0.2 },
          ],
          username,
        },
        {
          workflowName: `Swag Giveaway: ${username}`,
        },
      );
      setResult(result);
    } catch (error) {
      console.error("Error running workflow:", error);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-6 gap-8 w-full">
      <div className="flex items-center justify-center mb-4">
        <Image
          src="/gensx-dark.svg"
          alt="GenSX Logo"
          width={250}
          height={80}
          priority
        />
      </div>

      <div className="flex flex-col items-center justify-center w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">GenSX Swag Giveaway</h2>

        <form onSubmit={handleRunWorkflow} className="w-full space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-200 mb-1"
            >
              GitHub Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter GitHub username"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !username.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Processing..." : "Run Giveaway"}
          </button>
        </form>

        {result && (
          <div className="mt-8 p-6 bg-white rounded-lg shadow-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Result</h3>
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-red-700"
              >
                Start Over
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 text-gray-900">
                  <Image
                    src={result.profile.avatar_url || "/placeholder-avatar.png"}
                    alt={`${result.profile.name || username}'s avatar`}
                    width={60}
                    height={60}
                    className="rounded-full"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">
                    {result.profile.name || username}
                  </h4>
                  <p className="text-sm text-gray-900">@{username}</p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-gray-900">
                  Prize: <span className="text-blue-600">{result.prize}</span>
                </p>
                <p className="mt-2 italic text-gray-900">{result.message}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <Link
            href="/swag"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to main swag page
          </Link>
        </div>
      </div>
    </main>
  );
}
