"use client";

import Image from "next/image";
import { runGiveawayWorkflow } from "../actions/runWorkflow";
import { useState } from "react";

export default function SwagPage() {
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRunWorkflow = async () => {
    setIsLoading(true);
    try {
      const result = await runGiveawayWorkflow({
        prizes: [
          { name: "T-Shirt", probability: 0.5 },
          { name: "Stickers", probability: 0.3 },
          { name: "Mug", probability: 0.1 },
        ],
      });
      setResult(result);
    } catch (error) {
      console.error("Error running workflow:", error);
      setResult("An error occurred while running the workflow");
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
              "Run Workflow"
            )}
          </button>

          {result && (
            <div className="mt-8 p-8 bg-white rounded-xl shadow-lg text-center border-2 border-blue-500 transform transition-all duration-500 hover:shadow-xl w-full max-w-md animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">
                Your Prize:
              </h3>
              <p className="text-xl font-bold text-blue-600">{result}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
