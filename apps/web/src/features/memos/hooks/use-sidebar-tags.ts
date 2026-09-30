import { useLocation } from '@tanstack/react-router';
import { useMemoScope } from './use-memo-scope';
import { useMemoTags } from './use-memo-tags';
import { usePublicMemoTags } from './use-public-memo-tags';

export const useSidebarTags = () => {
  const { pathname } = useLocation();
  const isExplore = pathname.startsWith('/explore');
  const scope = useMemoScope();
  const scopedData = useMemoTags({ scope, enabled: !isExplore });
  const publicData = usePublicMemoTags({ enabled: isExplore });

  return isExplore ? publicData : scopedData;
};
