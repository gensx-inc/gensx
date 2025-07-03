"use client";

import { ChevronLeft, ChevronRight, Copy, Eye, EyeOff } from "lucide-react";

import { Button } from "./button";

interface VersionControlsProps {
  currentVersion: number;
  totalVersions: number;
  onPreviousVersion: () => void;
  onNextVersion: () => void;
  showDiff: boolean;
  onToggleDiff: () => void;
  onCopy: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export function VersionControls({
  currentVersion,
  totalVersions,
  onPreviousVersion,
  onNextVersion,
  showDiff,
  onToggleDiff,
  onCopy,
  canGoPrevious,
  canGoNext,
}: VersionControlsProps) {
  return (
    <div className="flex items-center justify-between bg-white/20 backdrop-blur-md rounded-full px-4 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPreviousVersion}
          disabled={!canGoPrevious}
          className="rounded-full px-3"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        <span className="text-sm text-[#333333] font-medium px-2">
          Version {currentVersion} of {totalVersions}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNextVersion}
          disabled={!canGoNext}
          className="rounded-full px-3"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleDiff}
          className="rounded-full px-3"
        >
          {showDiff ? (
            <>
              <EyeOff className="w-4 h-4 mr-1" />
              Hide Diff
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-1" />
              Show Diff
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCopy}
          className="rounded-full px-3"
        >
          <Copy className="w-4 h-4 mr-1" />
          Copy
        </Button>
      </div>
    </div>
  );
}
