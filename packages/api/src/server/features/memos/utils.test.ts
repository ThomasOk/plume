import { describe, it, expect } from 'vitest';
import {
  extractTagsFromContent,
  buildTagTree,
  buildFilterConditions,
} from './utils';

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

// buildTagTree

describe('buildTagTree', () => {
  it('returns an empty array for an empty object', () => {
    expect(buildTagTree({})).toEqual([]);
  });

  it('builds a single flat node', () => {
    const result = buildTagTree({ cooking: 5 });
    expect(result).toEqual([
      { name: 'cooking', fullPath: 'cooking', count: 5, children: [] },
    ]);
  });

  it('builds multiple flat nodes', () => {
    const result = buildTagTree({ cooking: 5, travel: 2 });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ name: 'cooking', count: 5 });
    expect(result[1]).toMatchObject({ name: 'travel', count: 2 });
  });

  it('builds a nested node (parent with no direct count)', () => {
    const result = buildTagTree({ 'cooking/french': 3 });
    expect(result).toEqual([
      {
        name: 'cooking',
        fullPath: 'cooking',
        count: 0,
        children: [
          {
            name: 'french',
            fullPath: 'cooking/french',
            count: 3,
            children: [],
          },
        ],
      },
    ]);
  });

  it('assigns count to parent when it has its own entry', () => {
    const result = buildTagTree({ cooking: 5, 'cooking/french': 3 });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: 'cooking', count: 5 });
    expect(result[0]!.children).toHaveLength(1);
    expect(result[0]!.children[0]).toMatchObject({
      name: 'french',
      count: 3,
    });
  });

  it('handles deeply nested tags', () => {
    const result = buildTagTree({ 'a/b/c': 1 });
    expect(result[0]?.name).toBe('a');
    expect(result[0]?.children[0]?.name).toBe('b');
    expect(result[0]?.children[0]?.children[0]).toMatchObject({
      name: 'c',
      fullPath: 'a/b/c',
      count: 1,
    });
  });

  it('sets correct fullPath at each level', () => {
    const result = buildTagTree({ 'dev/web': 4 });
    expect(result[0]?.fullPath).toBe('dev');
    expect(result[0]?.children[0]?.fullPath).toBe('dev/web');
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
