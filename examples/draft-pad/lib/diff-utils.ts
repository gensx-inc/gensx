import { DIFF_DELETE, DIFF_INSERT, diff_match_patch } from "diff-match-patch";

export interface DiffSegment {
  type: "unchanged" | "added" | "removed";
  value: string;
}

export function calculateDiff(oldText: string, newText: string): DiffSegment[] {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(oldText, newText);
  dmp.diff_cleanupSemantic(diffs);

  return diffs.map((diff) => {
    const [operation, value] = diff;
    if (operation === DIFF_INSERT) {
      return { type: "added", value };
    } else if (operation === DIFF_DELETE) {
      return { type: "removed", value };
    } else {
      return { type: "unchanged", value };
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
