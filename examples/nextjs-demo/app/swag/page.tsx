"use client";

import Image from "next/image";
import Link from "next/link";
import { runGiveawayWorkflow } from "../actions/runGiveawayWorkflow";
import { useState, useEffect, useRef } from "react";
import type { SwagGiveawayOutput } from "../actions/runGiveawayWorkflow";
import { checkStarsWorkflow } from "../actions/checkStars";

export default function SwagPage() {
  const [result, setResult] = useState<SwagGiveawayOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stargazers, setStargazers] = useState<string[]>([]);
  const isInitialized = useRef(false);
  const isChecking = useRef(false);
  const processedStargazers = useRef(new Set<string>());

  useEffect(() => {
    // Initial check for stargazers
    checkStargazers();

    // Set up periodic checking every 15 seconds
    const interval = setInterval(checkStargazers, 15000);

    return () => clearInterval(interval);
  }, []);

  const checkStargazers = async () => {
    // Prevent concurrent executions
    if (isChecking.current) {
      console.log("Already checking stargazers, skipping this call");
      return;
    }

    try {
      isChecking.current = true;

      const result = await checkStarsWorkflow(
        { repoPath: "gensx-inc/gensx" },
        { workflowName: "Check Stargazers" },
      );

      console.log(result);

      const newStargazers = result.stargazers.map((s) => s.username);

      if (!isInitialized.current) {
        isInitialized.current = true;
        setStargazers(newStargazers);

        // Add initial stargazers to processed set to avoid triggering giveaways for them
        newStargazers.forEach((username) => {
          processedStargazers.current.add(username);
        });

        return;
      }

      // Use functional state update to ensure we're working with the latest state
      setStargazers((prevStargazers) => {
        // Find new stargazers that weren't in the previous list
        const newlyAddedStargazers = newStargazers.filter(
          (username) => !prevStargazers.includes(username),
        );

        // Trigger giveaway for each new stargazer (only if not already processed)
        for (const username of newlyAddedStargazers) {
          if (!processedStargazers.current.has(username)) {
            processedStargazers.current.add(username);
            handleRunWorkflow(username);
          }
        }

        return newStargazers;
      });
    } catch (error) {
      console.error("Error checking stargazers:", error);
    } finally {
      isChecking.current = false;
    }
  };

  const handleReset = () => {
    setResult(null);
  };

  const handleRunWorkflow = async (username: string) => {
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
      <div className="flex items-center justify-center mb-4 mt-4">
        <Image
          src="/gensx-dark.svg"
          alt="GenSX Logo"
          width={250}
          height={80}
          priority
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-7xl">
        {/* QR Code Section - Left */}
        <div className="flex-1 flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-6 mt-2">
            Star GenSX on Github to win swag!
          </h2>
          <Image
            src="/gensx-qr.png"
            alt="QR Code for GenSX"
            width={350}
            height={350}
            className="rounded-lg"
          />
          <Link
            href="https://github.com/gensx-inc/gensx"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 text-white hover:text-blue-600 font-medium text-2xl flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="inline-block"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            https://github.com/gensx-inc/gensx
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center mt-16">
          <Link
            href="/swag/backup"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Manually submit a username →
          </Link>
        </div>
      </div>
    </main>
  );
}
