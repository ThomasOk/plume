import { useState, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { MdExpandMore, MdExpandLess } from 'react-icons/md';
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
  const shouldReduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      setNeedsExpansion(contentHeight > maxHeight);
    }
  }, [content, maxHeight]);

  return (
    <div className="relative">
      <motion.div
        ref={contentRef}
        initial={false}
        animate={{
          height: isExpanded || !needsExpansion ? 'auto' : maxHeight,
        }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 0.3, ease: [0.455, 0.03, 0.515, 0.955] }
        }
        style={
          !isExpanded && needsExpansion
            ? { maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' }
            : undefined
        }
        className="overflow-hidden relative"
      >
        <MarkdownContent content={content} />
      </motion.div>

      <AnimatePresence>
        {needsExpansion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-1 flex justify-start"
          >
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{isExpanded ? 'Show less' : 'Show more'}</span>
              {isExpanded ? (
                <MdExpandLess className="size-3.5" />
              ) : (
                <MdExpandMore className="size-3.5" />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
