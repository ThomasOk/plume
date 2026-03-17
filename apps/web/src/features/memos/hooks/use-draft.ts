import { useCallback, useEffect, useRef } from 'react';

const DEBOUNCE_DELAY = 500;

const buildKey = (userId: string, draftKey: string) => `${userId}-${draftKey}`;

export const useDraft = (userId: string | undefined, draftKey: string) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getDraft = useCallback((): string => {
    if (!userId) return '';
    return localStorage.getItem(buildKey(userId, draftKey)) ?? '';
  }, [userId, draftKey]);

  const saveDraft = useCallback(
    (content: string) => {
      if (!userId) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const key = buildKey(userId, draftKey);
        if (content.trim()) {
          localStorage.setItem(key, content);
        } else {
          localStorage.removeItem(key);
        }
      }, DEBOUNCE_DELAY);
    },
    [userId, draftKey],
  );

  const clearDraft = useCallback(() => {
    if (!userId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    localStorage.removeItem(buildKey(userId, draftKey));
  }, [userId, draftKey]);

  // Cleanup pending debounce on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { getDraft, saveDraft, clearDraft };
};
