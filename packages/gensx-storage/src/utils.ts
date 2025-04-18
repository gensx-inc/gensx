/**
 * Convert string to URL-safe base64
 * @param str The string to encode
 * @returns URL-safe base64 encoded string
 */
export function toBase64UrlSafe(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Convert URL-safe base64 to string
 * @param base64 The URL-safe base64 string to decode
 * @returns Decoded string
 */
export function fromBase64UrlSafe(base64: string): string {
  // Add back padding if needed
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;

  return Buffer.from(
    padded.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf-8");
}
