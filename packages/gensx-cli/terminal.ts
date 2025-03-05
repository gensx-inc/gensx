/**
 * Waits for a single keypress in the terminal using Deno's native APIs.
 * @returns The key that was pressed
 */
export async function waitForKeypress(): Promise<string> {
  const buf = new Uint8Array(1);
  const n = await Deno.stdin.read(buf);
  if (n === null) {
    return "\n"; // EOF
  }
  return String.fromCharCode(buf[0]);
}
