import { useLocation } from '@tanstack/react-router';
import { usePrivateMemoTags } from './use-private-memo-tags';
import { usePublicMemoTags } from './use-public-memo-tags';

export const useSidebarTags = () => {
  const { pathname } = useLocation();
  const isExplore = pathname.startsWith('/explore');
  const privateData = usePrivateMemoTags({ enabled: !isExplore });
  const publicData = usePublicMemoTags({ enabled: isExplore });

  return isExplore ? publicData : privateData;
};
