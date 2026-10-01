import { describe, it, expect } from 'vitest';
import { redirectSearchSchema } from './redirect';

describe('redirectSearchSchema', () => {
  it.each(['/invitations/abc?accept=true', '/spaces/s1'])('keeps a path on this site: %s', (redirect) => {
    expect(redirectSearchSchema.parse({ redirect })).toEqual({ redirect });
  });

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', '/\t/evil.example', '/\n/evil.example', 'javascript:alert(1)'])(
    'drops anything that leaves the site: %s',
    (redirect) => {
      expect(redirectSearchSchema.parse({ redirect })).toEqual({ redirect: undefined });
    },
  );

  it('drops a value that is not a string', () => {
    expect(redirectSearchSchema.parse({ redirect: 42 })).toEqual({ redirect: undefined });
  });
});
