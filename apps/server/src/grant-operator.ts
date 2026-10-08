import { grantOperator } from '@repo/auth/operator';
import { runOperatorCommand } from './lib/operator-command';

// Makes an account an operator (ADR 0007). In production, from a shell on the server
// service: `node /app/dist/grant-operator.js <user-id>`. Running it twice changes nothing.
await runOperatorCommand(grantOperator, 'is now an operator');
