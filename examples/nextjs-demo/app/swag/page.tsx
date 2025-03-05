"use client";

import Image from "next/image";
import { runGiveawayWorkflow } from "../actions/runWorkflow";
import { useState } from "react";
import type { SwagGiveawayOutput } from "../actions/runWorkflow";

export default function SwagPage() {
  const [result, setResult] = useState<SwagGiveawayOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = () => {
    setResult(null);
  };

  const handleRunWorkflow = async () => {
    setIsLoading(true);
    const username = "dereklegenzoff";
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
      <h1 className="text-4xl font-bold mb-4">GenSX Swag Wheel</h1>

      <div className="flex flex-col sm:flex-row gap-8 w-full max-w-7xl">
        {/* QR Code Section - Left */}
        <div className="flex-1 flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-6">
            Step 1. Star GenSX on Github
          </h2>
          <Image
            src="/gensx-qr.png"
            alt="QR Code for GenSX"
            width={350}
            height={350}
            className="rounded-lg"
          />
        </div>

        {/* Button and Result Section - Right */}
        <div className="flex-1 flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-6">Step 2. Win Swag!!</h2>
          <button
            onClick={handleRunWorkflow}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
                <span>Running...</span>
              </div>
            ) : (
              "Run your first workflow"
            )}
          </button>

          {result && (
            <div className="mt-8 p-8 bg-white rounded-xl shadow-lg text-center border-2 border-blue-500 transform transition-all duration-500 hover:shadow-xl w-full max-w-md animate-in fade-in slide-in-from-bottom-4 relative">
              <button
                onClick={handleReset}
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Reset"
              >
                ×
              </button>
              <h3 className="text-2xl font-bold mb-6 text-gray-800">
                🎉 Congratulations! 🎉
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-lg text-gray-800">
                    You won a prize. Go look at the trace to see what you won.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
