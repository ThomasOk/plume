import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/ui/components/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/components/tooltip';
import { Link } from '@tanstack/react-router';
import { IoEarthOutline } from 'react-icons/io5';
import { MdAutoAwesome, MdPushPin } from 'react-icons/md';
import type { Author, Comment, Memo } from '@/lib/types';
import type { ReactNode } from 'react';
import { RelativeDate } from './relative-date';

interface MemoHeaderProps {
  memo: Memo | Comment;
  author?: Author;
  /** Leave the author and date out, as while editing. */
  hideByline?: boolean;
  /** Leave the pinned mark out, where the list is no one's scope (ADR 0006). */
  ignorePins?: boolean;
  /** Mark the memo as featured, where that decides its place. */
  markFeatured?: boolean;
  /** Controls placed before the marks, such as the focus mode button. */
  actions?: ReactNode;
  /** The actions menu, placed last. */
  menu?: ReactNode;
}

export const MemoHeader = ({
  memo,
  author,
  hideByline = false,
  ignorePins = false,
  markFeatured = false,
  actions,
  menu,
}: MemoHeaderProps) => {
  const isComment = !!memo.parentId;
  const isPinned = memo.pinnedAt !== null;
  const isFeatured = memo.featuredAt !== null;

  return (
    <div className="flex justify-between items-center gap-1">
      {!hideByline ? (
        <div className="flex items-center gap-2 min-w-0">
          {author && (
            <Avatar className="size-7 shrink-0">
              <AvatarImage src={author.image ?? undefined} />
              <AvatarFallback className="text-xs">
                {author.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex flex-col min-w-0">
            {author && (
              <span className="text-xs font-medium truncate leading-tight">
                {author.name}
              </span>
            )}
            {isComment ? (
              <RelativeDate date={memo.createdAt} className="leading-tight" />
            ) : (
              <Link
                to="/memos/$memoId"
                params={{ memoId: memo.id }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors leading-tight"
              >
                <RelativeDate date={memo.createdAt} className="text-inherit" />
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-1">
        {actions}
        {isPinned && !ignorePins && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center" role="img" aria-label="Pinned">
                  <MdPushPin className="size-4 text-muted-foreground" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Pinned</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {isFeatured && markFeatured && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center" role="img" aria-label="Featured">
                  <MdAutoAwesome className="size-4 text-primary" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Featured</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {memo.visibility === 'public' && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center">
                  <IoEarthOutline className="size-4 text-muted-foreground" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Public</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {menu}
      </div>
    </div>
  );
};
