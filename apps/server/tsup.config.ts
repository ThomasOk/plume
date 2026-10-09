import { cpSync } from 'node:fs';
import { defineConfig } from 'tsup';

export default defineConfig({
  // `migrate` is Railway's pre-deploy command (see src/migrate.ts). The operator commands
  // ship too, so the role can be granted from a shell on the production service (ADR 0007),
  // and so does the showcase command an operator features Explore's memos with.
  entry: [
    './src/index.ts',
    './src/migrate.ts',
    './src/grant-operator.ts',
    './src/revoke-operator.ts',
    './src/seed-showcase.ts',
  ],
  format: 'esm',
  noExternal: [/.*/],
  platform: 'node',
  splitting: false,
  bundle: true,
  outDir: './dist',
  clean: true,
  env: { IS_SERVER_BUILD: 'true' },
  loader: { '.json': 'json' },
  minify: false,
  sourcemap: true,
  // The SQL migrations travel with the bundle, so the production image (which keeps only
  // `dist`) can apply them, and the showcase texts with them, for the same reason. `clean`
  // empties dist first, so these copies are always fresh.
  onSuccess: async () => {
    cpSync(
      new URL('../../packages/db/drizzle', import.meta.url),
      new URL('./dist/drizzle', import.meta.url),
      {
        recursive: true,
      },
    );
    cpSync(
      new URL('./src/showcase', import.meta.url),
      new URL('./dist/showcase', import.meta.url),
      {
        recursive: true,
        filter: (source) => !source.endsWith('.ts'),
      },
    );
  },

  // https://github.com/egoist/tsup/issues/927#issuecomment-2416440833
  // The banner is raw text esbuild can't rename around, so its import takes a name no
  // bundled dependency will declare (fflate imports `createRequire` at its top level).
  banner: ({ format }) => {
    if (format === 'esm')
      return {
        js: `import { createRequire as __bannerCreateRequire } from 'module'; const require = __bannerCreateRequire(import.meta.url);`,
      };
    return {};
  },
});
