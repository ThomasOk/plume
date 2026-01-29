import type { Element } from 'hast';

export const isTaskListItemNode = (node: Element): boolean => {
  return node.tagName === 'input' && node.properties?.type === 'checkbox';
};
