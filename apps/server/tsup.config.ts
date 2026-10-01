import { cpSync } from 'node:fs';
import { defineConfig } from 'tsup';

export default defineConfig({
  // `migrate` is Railway's pre-deploy command (see src/migrate.ts).
  entry: ['./src/index.ts', './src/migrate.ts'],
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
  // `dist`) can apply them. `clean` empties dist first, so this copy is always fresh.
  onSuccess: async () => {
    cpSync(
      new URL('../../packages/db/drizzle', import.meta.url),
      new URL('./dist/drizzle', import.meta.url),
      {
        recursive: true,
      },
    );
  },

  // https://github.com/egoist/tsup/issues/927#issuecomment-2416440833
  banner: ({ format }) => {
    if (format === 'esm')
      return {
        js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
      };
    return {};
  },
});
