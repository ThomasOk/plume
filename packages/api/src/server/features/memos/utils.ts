/**
 * Utility functions for memo operations
 */

import { sql, ilike } from '@repo/db';
import { memo } from '@repo/db/schema';
import type { listMemosSchema } from './schemas';
import type { z } from 'zod';

type ListMemosInput = z.infer<typeof listMemosSchema>;

/**
 * Builds the shared filter conditions for list and listPublic procedures.
 * Does not include the base condition (userId or visibility) — that's added by each procedure.
 */
export const buildFilterConditions = (input: ListMemosInput) => {
  const conditions = [];

  if (input.date) {
    conditions.push(sql`DATE(${memo.createdAt}) = ${input.date}`);
  }

  if (input.tag) {
    conditions.push(sql`
      EXISTS (
        SELECT 1
        FROM unnest(${memo.tags}) AS t
        WHERE t = ${input.tag}
        OR t LIKE ${input.tag + '/%'}
      )
    `);
  }

  if (input.query) {
    conditions.push(ilike(memo.content, `%${input.query}%`));
  }

  return conditions;
};

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
export const extractTagsFromContent = (content: string): string[] => {
  // Regex pattern for hashtags
  // - # : literal hashtag character
  // - ([a-zA-Z][a-zA-Z0-9_-]*) : capture group
  //   - [a-zA-Z] : must start with a letter
  //   - [a-zA-Z0-9_-]* : followed by 0+ letters, digits, underscore, or hyphen;
  const hashtagRegex = /#([a-zA-Z][a-zA-Z0-9_-]*(\/[a-zA-Z][a-zA-Z0-9_-]*)*)/g;

  // Find all matches in the content
  const matches = content.matchAll(hashtagRegex);

  // Extract the captured groups (without the #), convert to lowercase
  const tags = Array.from(matches, (match) => match[1]!.toLowerCase());

  // Remove duplicates using Set, then convert back to array
  return [...new Set(tags)];
};

type TagNode = {
  name: string;
  fullPath: string;
  count: number;
  children: TagNode[];
};
export const buildTagTree = (tags: Record<string, number>): TagNode[] => {
  const roots: TagNode[] = [];
  for (const [tagPath, count] of Object.entries(tags)) {
    const segments = tagPath.split('/');
    let currentChildren = roots;
    segments.forEach((segment, index) => {
      if (!currentChildren.some((tag) => tag.name === segment)) {
        currentChildren.push({
          name: segment,
          fullPath: segments.slice(0, index + 1).join('/'),
          count: index === segments.length - 1 ? count : 0,
          children: [],
        });
      }
      const node = currentChildren.find((tag) => tag.name === segment)!;
      currentChildren = node.children;
    });
  }

  return roots;
};
