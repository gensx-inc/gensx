/**
 * Convert string to URL-safe base64
 * @param str The string to encode
 * @returns URL-safe base64 encoded string
 */
export function toBase64UrlSafe(str: string): string {
  return Buffer.from(str).toString("base64url");
}

/**
 * Convert URL-safe base64 to string
 * @param base64 The URL-safe base64 string to decode
 * @returns Decoded string
 */
export function fromBase64UrlSafe(base64: string): string {
  return Buffer.from(base64, "base64url").toString("utf-8");
}
