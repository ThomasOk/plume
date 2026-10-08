import { revokeOperator } from '@repo/auth/operator';
import { runOperatorCommand } from './lib/operator-command';

// Takes the operator role back from an account (ADR 0007). In production, from a shell on
// the server service: `node /app/dist/revoke-operator.js <user-id>`. Running it twice
// changes nothing.
await runOperatorCommand(revokeOperator, 'is no longer an operator');
