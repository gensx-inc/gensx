import * as Diff from "diff";

export interface DiffSegment {
  type: "unchanged" | "added" | "removed";
  value: string;
}

export function calculateDiff(oldText: string, newText: string): DiffSegment[] {
  const changes = Diff.diffWords(oldText, newText);

  return changes.map((change) => {
    if (change.added) {
      return { type: "added", value: change.value };
    } else if (change.removed) {
      return { type: "removed", value: change.value };
    } else {
      return { type: "unchanged", value: change.value };
    }
  });
}

export function calculateStreamingDiff(
  oldText: string,
  partialNewText: string,
): DiffSegment[] {
  // For streaming, we treat everything as potentially new content
  // This will show blue highlights during streaming
  const commonLength = Math.min(oldText.length, partialNewText.length);

  // Find the common prefix
  let commonPrefixLength = 0;
  for (let i = 0; i < commonLength; i++) {
    if (oldText[i] === partialNewText[i]) {
      commonPrefixLength++;
    } else {
      break;
    }
  }

  const segments: DiffSegment[] = [];

  // Add the common prefix as unchanged
  if (commonPrefixLength > 0) {
    segments.push({
      type: "unchanged",
      value: oldText.substring(0, commonPrefixLength),
    });
  }

  // Add the rest as "added" (will be blue during streaming)
  if (partialNewText.length > commonPrefixLength) {
    segments.push({
      type: "added",
      value: partialNewText.substring(commonPrefixLength),
    });
  }

  return segments;
}
