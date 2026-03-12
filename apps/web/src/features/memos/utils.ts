import type { TagNode } from './types';

export const buildTagTree = (tags: Record<string, number>): TagNode[] => {
  const roots: TagNode[] = [];
  for (const [tagPath, count] of Object.entries(tags).sort((a, b) => a[0].localeCompare(b[0]))) {
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
