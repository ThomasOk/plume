import type { SpaceRole } from '@repo/db/schema';
import { mayManageMembership } from './space-policy';

// One row per cell of the role matrix, so the table can be read against the spec. Ticket 06
// adds the rows for the remaining actions.
describe('space policy', () => {
  it.each<[SpaceRole, boolean]>([
    ['admin', true],
    ['member', false],
  ])('invite, remove, or change a role — %s: %s', (role, allowed) => {
    expect(mayManageMembership(role)).toBe(allowed);
  });
});
