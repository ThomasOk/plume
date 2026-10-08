// Better Auth's own password hashing, for code that checks a password outside its endpoints
// (account deletion). Kept apart from `./password`, which the browser imports, so the hashing
// never reaches the client bundle.
//
// These are the library's defaults (scrypt). The auth configuration sets no custom
// `emailAndPassword.password` functions; if it ever does, this module must use them instead.
export { hashPassword, verifyPassword } from 'better-auth/crypto';
