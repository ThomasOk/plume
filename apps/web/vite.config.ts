import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import tanstackRouter from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react-swc';
import { z } from 'zod';
import { defineConfig, type Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envSchema = z.object({
  PUBLIC_WEB_URL: z.string().url().default('http://localhost:3035'),
  PUBLIC_BASE_PATH: z.string().startsWith('/').default('/'),
});

const env = envSchema.parse(process.env);
const webUrl = new URL(env.PUBLIC_WEB_URL);
const host = webUrl.hostname;
const port = parseInt(webUrl.port, 10);

/**
 * Serves the emoji picker's data from Plume itself, at `<base>emojibase/en/*.json`, so the
 * editor never fetches it from a third-party CDN. Read from the `emojibase-data` package,
 * the data follows the lockfile instead of a copy committed by hand.
 */
const emojibaseData = (): Plugin => {
  const require = createRequire(import.meta.url);
  const files = ['en/data.json', 'en/messages.json'];
  const read = (file: string) => readFileSync(require.resolve(`emojibase-data/${file}`));
  return {
    name: 'plume:emojibase-data',
    configureServer(server) {
      const prefix = `${server.config.base}emojibase/`;
      server.middlewares.use((req, res, next) => {
        const file = req.url?.startsWith(prefix) ? req.url.slice(prefix.length).split('?')[0] : undefined;
        if (!file || !files.includes(file)) return next();
        res.setHeader('Content-Type', 'application/json');
        res.end(read(file));
      });
    },
    generateBundle() {
      for (const file of files) {
        this.emitFile({ type: 'asset', fileName: `emojibase/${file}`, source: read(file) });
      }
    },
  };
};

export default defineConfig({
  plugins: [
    tanstackRouter({
      routeToken: 'layout',
      autoCodeSplitting: true,
    }),
    tailwindcss(),
    react(),
    emojibaseData(),
  ],
  base: env.PUBLIC_BASE_PATH,
  envPrefix: 'PUBLIC_',
  server: {
    host,
    port,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * Modified from:
         * https://github.com/vitejs/vite/discussions/9440#discussioncomment-11430454
         */
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const modulePath = id.split('node_modules/')[1];
            const topLevelFolder = modulePath?.split('/')[0];
            if (topLevelFolder !== '.pnpm') {
              return topLevelFolder;
            }
            const scopedPackageName = modulePath?.split('/')[1];
            const chunkName =
              scopedPackageName?.split('@')[
                scopedPackageName.startsWith('@') ? 1 : 0
              ];
            return chunkName;
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
