import { describe, it, expect } from 'vitest';
import { extractTagsFromContent, buildFilterConditions } from './memos-utils';

// extractTagsFromContent

describe('extractTagsFromContent', () => {
  it('returns an empty array for an empty string', () => {
    expect(extractTagsFromContent('')).toEqual([]);
  });

  it('returns an empty array when there are no hashtags', () => {
    expect(extractTagsFromContent('Hello world, no tags here.')).toEqual([]);
  });

  it('extracts a single hashtag', () => {
    expect(extractTagsFromContent('I love #cooking')).toEqual(['cooking']);
  });

  it('extracts multiple distinct hashtags', () => {
    expect(extractTagsFromContent('I love #cooking and #baking!')).toEqual([
      'cooking',
      'baking',
    ]);
  });

  it('deduplicates tags case-insensitively', () => {
    expect(extractTagsFromContent('#Cooking is fun #cooking')).toEqual([
      'cooking',
    ]);
  });

  it('converts all tags to lowercase', () => {
    expect(extractTagsFromContent('#TypeScript #React')).toEqual([
      'typescript',
      'react',
    ]);
  });

  it('extracts hierarchical tags (tag/subtag)', () => {
    expect(extractTagsFromContent('A note about #cooking/french')).toEqual([
      'cooking/french',
    ]);
  });

  it('extracts deeply nested hierarchical tags', () => {
    expect(extractTagsFromContent('#dev/web/react')).toEqual(['dev/web/react']);
  });

  it('ignores tags that start with a digit', () => {
    expect(extractTagsFromContent('#1invalid #2bad')).toEqual([]);
  });

  it('accepts tags with digits after the first letter', () => {
    expect(extractTagsFromContent('#tag1 #v2')).toEqual(['tag1', 'v2']);
  });

  it('accepts tags with hyphens and underscores', () => {
    expect(extractTagsFromContent('#my-tag #my_tag')).toEqual([
      'my-tag',
      'my_tag',
    ]);
  });

  it('preserves order of first occurrence', () => {
    expect(extractTagsFromContent('#c #a #b')).toEqual(['c', 'a', 'b']);
  });
});

// buildFilterConditions

describe('buildFilterConditions', () => {
  it('returns an empty array when no filters are provided', () => {
    expect(buildFilterConditions({})).toHaveLength(0);
  });

  it('returns one condition for a date filter', () => {
    expect(buildFilterConditions({ date: '2024-01-01' })).toHaveLength(1);
  });

  it('returns one condition for a tag filter', () => {
    expect(buildFilterConditions({ tag: 'cooking' })).toHaveLength(1);
  });

  it('returns one condition for a query filter', () => {
    expect(buildFilterConditions({ query: 'hello' })).toHaveLength(1);
  });

  it('returns three conditions when all filters are provided', () => {
    expect(
      buildFilterConditions({
        date: '2024-01-01',
        tag: 'cooking',
        query: 'hello',
      }),
    ).toHaveLength(3);
  });
});
