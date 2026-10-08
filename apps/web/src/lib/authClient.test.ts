import { expectTypeOf, test } from 'vitest';
import type { AuthSession } from './authClient';

// Checked by `pnpm typecheck`: the interface knows whether the user is an operator from the
// session alone, without an extra request (ADR 0007).
test("the session's user says whether they are an operator", () => {
  expectTypeOf<
    NonNullable<AuthSession>['user']['isOperator']
  >().toEqualTypeOf<boolean>();
});
