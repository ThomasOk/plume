import type { SpaceRole } from '@repo/db/schema';
import { keepsAnAdmin, may, mayDeleteMemo, mayEditMemo, type SpaceAction } from './space-policy';

// One row per cell of the role matrix, so the table can be read against the spec.
describe('the role matrix', () => {
  it.each<[SpaceAction, SpaceRole, boolean]>([
    ['readMemos', 'admin', true],
    ['readMemos', 'member', true],
    ['writeMemo', 'admin', true],
    ['writeMemo', 'member', true],
    ['editOwnMemo', 'admin', true],
    ['editOwnMemo', 'member', true],
    ['deleteOwnMemo', 'admin', true],
    ['deleteOwnMemo', 'member', true],
    // Editing another member's memo would be impersonation under their byline.
    ['editOthersMemo', 'admin', false],
    ['editOthersMemo', 'member', false],
    // Deleting it is moderation.
    ['deleteOthersMemo', 'admin', true],
    ['deleteOthersMemo', 'member', false],
    ['manageMembership', 'admin', true],
    ['manageMembership', 'member', false],
    ['manageSpace', 'admin', true],
    ['manageSpace', 'member', false],
  ])('%s — %s: %s', (action, role, allowed) => {
    expect(may(role, action)).toBe(allowed);
  });
});

// Leaving: "yes, unless last admin". The rule is about what remains, so it is the same for
// leaving, being removed, and being demoted.
describe('a member losing their place or their role', () => {
  it.each<[SpaceRole, number, boolean]>([
    ['member', 1, true],
    ['admin', 2, true],
    ['admin', 1, false],
  ])('%s, with %i admin(s) in the space — keeps an admin: %s', (targetRole, adminCount, keeps) => {
    expect(keepsAnAdmin({ targetRole, adminCount })).toBe(keeps);
  });
});

describe('acting on one memo', () => {
  it.each<[string, { isAuthor: boolean; role: SpaceRole | null }, boolean, boolean]>([
    // [who, facts, may edit, may delete]
    ['its author, outside any space', { isAuthor: true, role: null }, true, true],
    ['another user, outside any space', { isAuthor: false, role: null }, false, false],
    ['its author, a member', { isAuthor: true, role: 'member' }, true, true],
    ['its author, an admin', { isAuthor: true, role: 'admin' }, true, true],
    ['another member', { isAuthor: false, role: 'member' }, false, false],
    ['an admin', { isAuthor: false, role: 'admin' }, false, true],
  ])('%s — edit: %s, delete: %s', (_who, facts, edit, del) => {
    expect(mayEditMemo(facts)).toBe(edit);
    expect(mayDeleteMemo(facts)).toBe(del);
  });
});
