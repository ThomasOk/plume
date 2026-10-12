// A value no other test writes, even one running at the same millisecond in another worker:
// the tests share one database and one user, so a timestamp alone can collide.
export const unique = () => `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
