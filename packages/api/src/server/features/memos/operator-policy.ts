// What an operator may do, as pure functions over plain values, like the space role matrix.
// Apart from it on purpose: being an operator grants nothing inside a space (ADR 0007), so
// no space policy reads the flag, and no rule here reads a space role.
//
// Imported by the web client too, through `@repo/api/schemas`, so that the interface offers
// exactly what the server allows. Keep it free of anything that cannot run in a browser.

export interface OperatorActor {
  isOperator: boolean;
}

// Featuring is curation of Explore, which is no one's scope: authorship does not count, and
// an operator may feature any author's public memo.
export function mayFeatureMemo({ isOperator }: OperatorActor): boolean {
  return isOperator;
}

// Deleting is moderation of Explore: an operator may delete any author's memo Explore shows,
// or a comment under one, and nothing else (ADR 0007). Whoever may delete a memo by their
// authorship or their space role is the space policy's answer; the two are asked apart and
// combined by "or" where a memo is deleted.
export function mayDeletePublicMemo({ isOperator }: OperatorActor, { isPublic }: { isPublic: boolean }): boolean {
  return isOperator && isPublic;
}
