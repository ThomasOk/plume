import { visit } from 'unist-util-visit';
import type { PhrasingContent, Root } from 'mdast';

const mentionRegex = /@([a-z][a-z0-9_]{1,28}[a-z0-9])/g;

export function remarkMention() {
  return (tree: Root) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index === undefined) return;

      const matches = [...node.value.matchAll(mentionRegex)];
      if (matches.length === 0) return;

      const newNodes: PhrasingContent[] = [];
      let lastIndex = 0;

      for (const match of matches) {
        const matchStart = match.index!;
        if (matchStart > lastIndex) {
          newNodes.push({
            type: 'text',
            value: node.value.slice(lastIndex, matchStart),
          });
        }
        const username = match[1]!;
        newNodes.push({
          type: 'mention' as never,
          value: username,
          data: {
            hName: 'span',
            hProperties: {
              className: 'mention',
              dataMention: username,
            },
          },
          children: [{ type: 'text', value: `@${username}` }],
        } as never);
        lastIndex = matchStart + match[0].length;
      }

      if (lastIndex < node.value.length) {
        newNodes.push({ type: 'text', value: node.value.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...newNodes);
    });
  };
}
