import type { Element } from 'hast';

export const isTaskListItemNode = (node: Element): boolean => {
  return node.tagName === 'input' && node.properties?.type === 'checkbox';
};

export const isMentionNode = (node: Element): boolean => {
  const classes = node.properties?.className;
  return (
    (Array.isArray(classes) && classes.includes('mention')) ||
    typeof node.properties?.dataMention === 'string'
  );
};
