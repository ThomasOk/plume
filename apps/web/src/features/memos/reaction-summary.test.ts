import { describe, expect, it } from 'vitest';
import { withReaction } from './reaction-summary';

const me = { id: 'bob', name: 'Bob' };
const alice = { id: 'alice', name: 'Alice' };
const carol = { id: 'carol', name: 'Carol' };

describe('withReaction, the summary as it stands once the reader’s reaction changes', () => {
  it('adds a first reaction, as the reader’s own', () => {
    expect(withReaction([], me, '👍')).toEqual([
      { emoji: '👍', count: 1, reactedByMe: true, reactors: [me] },
    ]);
  });

  it('joins others who chose the same emoji', () => {
    const summary = [{ emoji: '🎉' as const, count: 1, reactedByMe: false, reactors: [alice] }];

    expect(withReaction(summary, me, '🎉')).toEqual([
      { emoji: '🎉', count: 2, reactedByMe: true, reactors: [alice, me] },
    ]);
  });

  it('replaces a reaction: one less on the old emoji, one more on the new', () => {
    const summary = [
      { emoji: '👍' as const, count: 2, reactedByMe: true, reactors: [alice, me] },
      { emoji: '😢' as const, count: 1, reactedByMe: false, reactors: [carol] },
    ];

    expect(withReaction(summary, me, '😢')).toEqual([
      { emoji: '👍', count: 1, reactedByMe: false, reactors: [alice] },
      { emoji: '😢', count: 2, reactedByMe: true, reactors: [carol, me] },
    ]);
  });

  it('removes a reaction', () => {
    const summary = [{ emoji: '👍' as const, count: 2, reactedByMe: true, reactors: [alice, me] }];

    expect(withReaction(summary, me, null)).toEqual([
      { emoji: '👍', count: 1, reactedByMe: false, reactors: [alice] },
    ]);
  });

  it('drops an emoji nobody chooses any more', () => {
    const summary = [
      { emoji: '👍' as const, count: 1, reactedByMe: false, reactors: [alice] },
      { emoji: '💡' as const, count: 1, reactedByMe: true, reactors: [me] },
    ];

    expect(withReaction(summary, me, null)).toEqual([
      { emoji: '👍', count: 1, reactedByMe: false, reactors: [alice] },
    ]);
  });

  it('keeps the emojis in the order of the set, wherever a new one lands', () => {
    const summary = [
      { emoji: '👍' as const, count: 1, reactedByMe: false, reactors: [alice] },
      { emoji: '😢' as const, count: 1, reactedByMe: true, reactors: [me] },
    ];

    expect(withReaction(summary, me, '🎉').map(({ emoji }) => emoji)).toEqual(['👍', '🎉']);
    expect(withReaction([{ ...summary[1]! }], me, '❤️').map(({ emoji }) => emoji)).toEqual(['❤️']);
    expect(
      withReaction([...summary, { emoji: '🙏', count: 1, reactedByMe: false, reactors: [carol] }], me, '💡').map(
        ({ emoji }) => emoji,
      ),
    ).toEqual(['👍', '💡', '🙏']);
  });
});
