/**
 * Utility functions for memo operations
 */

/**
 * Extracts unique hashtags from markdown content
 *
 * @example
 * extractTagsFromContent("I love #cooking and #baking! #Cooking")
 * // Returns: ["cooking", "baking"]
 *
 * @param content - The markdown content to extract tags from
 * @returns Array of unique tags (lowercase, without #)
 */
export function extractTagsFromContent(content: string): string[] {
  // Regex pattern for hashtags
  // - # : literal hashtag character
  // - ([a-zA-Z][a-zA-Z0-9_-]*) : capture group
  //   - [a-zA-Z] : must start with a letter
  //   - [a-zA-Z0-9_-]* : followed by 0+ letters, digits, underscore, or hyphen;
  const hashtagRegex = /#([a-zA-Z][a-zA-Z0-9_-]*)/g;

  // Find all matches in the content
  const matches = content.matchAll(hashtagRegex);

  // Extract the captured groups (without the #), convert to lowercase
  const tags = Array.from(matches, (match) => match[1]!.toLowerCase());

  // Remove duplicates using Set, then convert back to array
  return [...new Set(tags)];
}
