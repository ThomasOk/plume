import { useRef } from 'react';
import { sounds } from '@/lib/sounds';

/**
 * The sounds of a menu that unfolds its options: it unfolds on opening, ticks on a choice
 * and folds when closed without one. A choice closes the menu too, and the fold would sound
 * over the tick, so `choose` marks the closing it causes as already heard.
 */
export const useMenuSounds = () => {
  const chose = useRef(false);

  const onOpenChange = (open: boolean) => {
    if (open) sounds.unfold();
    else if (!chose.current) sounds.fold();
    chose.current = false;
  };

  const choose = () => {
    chose.current = true;
    sounds.tick();
  };

  return { onOpenChange, choose };
};
