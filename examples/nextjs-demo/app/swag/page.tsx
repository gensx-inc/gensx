"use client";

import { useState } from "react";
import Image from "next/image";
import SpinWheel, { WheelSegment } from "../components/SpinWheel";
import { defaultSwagSegments } from "../config/wheelConfig";

export default function SwagPage() {
  const [winHistory, setWinHistory] = useState<WheelSegment[]>([]);

  // Handle spin end
  const handleSpinEnd = (segment: WheelSegment) => {
    setWinHistory((prev) => [segment, ...prev].slice(0, 5)); // Keep last 5 wins
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 gap-8">
      <h1 className="text-4xl font-bold mb-4">GenSX Swag Wheel</h1>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-4xl">
        <div className="flex-1 flex flex-col gap-6">
          {/* Win history */}
          {/* <div className="bg-white/10 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">Win History</h2>
            {winHistory.length > 0 ? (
              <ul className="space-y-2">
                {winHistory.map((win, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: win.color }}
                    />
                    <span>{win.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Spin the wheel to see your wins!</p>
            )}
          </div> */}
          <Image
            src="/gensx-qr.png"
            alt="QR Code for GenSX"
            width={600}
            height={600}
          />
        </div>

        {/* Wheel component */}
        <div className="flex-1 flex justify-center items-center">
          <SpinWheel
            segments={defaultSwagSegments}
            onSpinEnd={handleSpinEnd}
            wheelSize={600}
            spinDuration={5}
            buttonText="Spin for Swag!"
          />
        </div>
      </div>
    </main>
  );
}
