export type TagNode = {
  name: string;
  fullPath: string;
  count: number;
  children: TagNode[];
};

/**
 * Whose memos the current view reads, as the client knows it. The server resolves the
 * user itself, so the personal scope carries nothing.
 */
export type MemoViewScope = { kind: 'personal' } | { kind: 'space'; spaceId: string };
