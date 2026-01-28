import { useState, useRef, useEffect } from 'react';
import { Button } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import { MarkdownContent } from './markdown-content';

interface ExpandableMarkdownProps {
  content: string;
  maxHeight?: number; // in pixels
}

export const ExpandableMarkdown = ({
  content,
  maxHeight = 300,
}: ExpandableMarkdownProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if content height exceeds maxHeight
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      setNeedsExpansion(contentHeight > maxHeight);
    }
  }, [content, maxHeight]);

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className={cn(
          'overflow-hidden transition-all duration-300',
          !isExpanded && needsExpansion && 'relative'
        )}
        style={{
          maxHeight: !isExpanded && needsExpansion ? `${maxHeight}px` : 'none',
        }}
      >
        <MarkdownContent content={content} />

        {/* Gradient fade effect when collapsed */}
        {!isExpanded && needsExpansion && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        )}
      </div>

      {/* Show more / Show less button */}
      {needsExpansion && (
        <div className="mt-2 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </Button>
        </div>
      )}
    </div>
  );
};
