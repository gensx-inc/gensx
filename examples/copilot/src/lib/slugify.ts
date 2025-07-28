/**
 * Convert a string to a URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Find an item by slug, with fallback to ID for backward compatibility
 */
export function findBySlugOrId<T extends { id: string; name: string }>(
  items: T[],
  slugOrId: string,
): T | undefined {
  // First try to find by slug
  const bySlug = items.find((item) => slugify(item.name) === slugOrId);
  if (bySlug) return bySlug;

  // Fallback to ID for backward compatibility
  return items.find((item) => item.id === slugOrId);
}

/**
 * Generate a unique slug for an item, adding a suffix if needed
 */
export function generateUniqueSlug<T extends { id: string; name: string }>(
  items: T[],
  name: string,
  excludeId?: string,
): string {
  const baseSlug = slugify(name);
  const existingItems = items.filter((item) => item.id !== excludeId);

  // Check if base slug is unique
  if (!existingItems.some((item) => slugify(item.name) === baseSlug)) {
    return baseSlug;
  }

  // Find a unique suffix
  let counter = 2;
  let uniqueSlug = `${baseSlug}-${counter}`;

  while (existingItems.some((item) => slugify(item.name) === uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}
