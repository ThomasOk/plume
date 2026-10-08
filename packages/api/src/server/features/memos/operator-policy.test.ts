import { mayDeletePublicMemo, mayFeatureMemo } from './operator-policy';

// Featuring answers from the operator flag alone: authorship and a space role do not count,
// so the actor carries nothing else.
describe('who may feature a memo on Explore', () => {
  it.each<[string, boolean, boolean]>([
    ['an operator', true, true],
    ['anyone else', false, false],
  ])('%s: %s', (_who, isOperator, allowed) => {
    expect(mayFeatureMemo({ isOperator })).toBe(allowed);
  });
});

// Deleting as an operator answers from the flag and from whether the memo is public, which a
// comment is when its parent is: authorship and a space role do not count. What the space
// policy allows is asked of it separately, never here.
describe('who may delete a memo as an operator', () => {
  it.each<[string, boolean, boolean, boolean]>([
    ['an operator, on a public memo', true, true, true],
    ['an operator, on a memo that is not public', true, false, false],
    ['anyone else, on a public memo', false, true, false],
    ['anyone else, on a memo that is not public', false, false, false],
  ])('%s: %s', (_who, isOperator, isPublic, allowed) => {
    expect(mayDeletePublicMemo({ isOperator }, { isPublic })).toBe(allowed);
  });
});
