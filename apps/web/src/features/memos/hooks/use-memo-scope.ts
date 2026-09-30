import { useParams } from '@tanstack/react-router';
import type { MemoViewScope } from '../types';

/**
 * The scope of the view being displayed, read from the URL: under `/spaces/$spaceId` it
 * is that space, everywhere else it is the user's personal memos. The sidebar panels
 * (Activity, Tag tree) follow it without the route passing anything down.
 */
export const useMemoScope = (): MemoViewScope => {
  const { spaceId } = useParams({ strict: false });
  return spaceId ? { kind: 'space', spaceId } : { kind: 'personal' };
};
