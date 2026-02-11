import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';

/**
 * Custom hook to navigate and update the date filter in URL search params.
 *
 *
 * @returns A memoized function that updates the 'date' search param
 *
 * @example
 * ```tsx
 * const navigateToDateFilter = useDateFilterNavigation();
 *
 * // Navigate to filter by a specific date
 * navigateToDateFilter('2026-02-08');
 * ```
 */

export const useDateFilterNavigation = () => {
  const navigate = useNavigate();

  const navigateToDateFilter = useCallback(
    (date: string) => {
      navigate({
        to: '.',
        search: (prev) => ({ ...prev, date }),
      });
    },
    [navigate],
  );

  return navigateToDateFilter;
};
