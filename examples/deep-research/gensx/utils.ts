export function cleanContent(content: string) {
  // Remove inline links [text](url) and keep just the text
  let cleaned = content.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove reference links [text][reference] and keep just the text
  cleaned = cleaned.replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1");

  // Remove inline images ![alt text](url)
  cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]+\)/g, "");

  // Remove reference images ![alt text][reference]
  cleaned = cleaned.replace(/!\[[^\]]*\]\[[^\]]*\]/g, "");

  // Remove autolinks <url> completely
  cleaned = cleaned.replace(/<https?:\/\/[^>]+>/g, "");

  // Remove reference definitions [reference]: url
  cleaned = cleaned.replace(/^\s*\[[^\]]+\]:\s*\S+.*$/gm, "");

  return cleaned;
}
