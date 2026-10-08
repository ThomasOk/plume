import { mayFeatureMemo } from './operator-policy';

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
