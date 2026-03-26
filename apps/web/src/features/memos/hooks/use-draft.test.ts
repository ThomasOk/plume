import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useDraft } from './use-draft';

const USER_ID = 'user-123';
const DRAFT_KEY = 'memo-draft';

describe('useDraft', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves and retrieves a draft', () => {
    const { result } = renderHook(() => useDraft(USER_ID, DRAFT_KEY));

    act(() => {
      result.current.saveDraft('Hello world');
      vi.runAllTimers();
    });

    expect(result.current.getDraft()).toBe('Hello world');
  });

  it('clears a draft', () => {
    const { result } = renderHook(() => useDraft(USER_ID, DRAFT_KEY));

    act(() => {
      result.current.saveDraft('Hello world');
      vi.runAllTimers();
      result.current.clearDraft();
    });

    expect(result.current.getDraft()).toBe('');
  });

  it('does not save draft without userId', () => {
    const { result } = renderHook(() => useDraft(undefined, DRAFT_KEY));

    act(() => {
      result.current.saveDraft('Hello world');
      vi.runAllTimers();
    });

    expect(result.current.getDraft()).toBe('');
  });
});
