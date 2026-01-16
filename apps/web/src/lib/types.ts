/**
 * Frontend types centralization
 *
 * This file infers all types from tRPC (RouterOutputs).
 * Never import directly from @repo/db in the frontend!
 *
 * Pattern:
 * 1. Import AppRouter from @repo/api
 * 2. Infer RouterOutputs via @trpc/server
 * 3. Extract entity types
 */

import type { AppRouter } from '@repo/api/server';
import type { inferRouterOutputs } from '@trpc/server';

// Infer all tRPC router return types
type RouterOutputs = inferRouterOutputs<AppRouter>;

/**
 * Memo type
 *
 * Inferred from `memos.list` return type
 * Array of memos ’ extract single element type with [number]
 */
export type Memo = RouterOutputs['memos']['list'][number];

// As you add more features, add types here
// Examples for later:
// export type Tag = RouterOutputs['tags']['list'][number];
// export type User = RouterOutputs['auth']['getUser'];
