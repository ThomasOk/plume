import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Card } from '@repo/ui/components/card';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { MdOutlineCloseFullscreen } from 'react-icons/md';
import type { ReactNode } from 'react';

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

interface FocusModeDialogProps {
  open: boolean;
  onClose: () => void;
  /** The form, laid out to fill the card. */
  children: ReactNode;
}

/**
 * The editor enlarged over the page, for a memo or a comment, new or edited. A modal dialog:
 * the focus stays inside, Escape or a click on the backdrop closes it, and the page behind
 * neither scrolls nor reads out. Closing leaves the focus to the form, which puts it back in
 * its inline text field.
 */
export const FocusModeDialog = ({ open, onClose, children }: FocusModeDialogProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      {/* Mounted by motion rather than by Radix, so the dialog animates out before it goes. */}
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: EASE_OUT }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content
              asChild
              forceMount
              aria-describedby={undefined}
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              <motion.div
                className="fixed inset-4 z-50 mx-auto max-w-5xl outline-none"
                initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.98 }}
                transition={{ type: 'spring', bounce: 0.1, duration: prefersReducedMotion ? 0 : 0.3 }}
              >
                <DialogPrimitive.Title className="sr-only">Focus mode</DialogPrimitive.Title>
                <Card className="rounded-xl h-full flex flex-col py-0 relative">
                  <DialogPrimitive.Close
                    aria-label="Exit focus mode"
                    className="hit-area absolute top-3 right-3 z-10 text-muted-foreground hover:text-foreground transition-colors duration-150 p-1 rounded outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <MdOutlineCloseFullscreen className="size-4" />
                  </DialogPrimitive.Close>
                  {children}
                </Card>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
};
