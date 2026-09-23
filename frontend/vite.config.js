import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import fs from "fs";

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const useTls = env.TS_CERT_KEY && env.TS_CERT_CRT;

  return {
    root,
    plugins: [react()],

    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },

    optimizeDeps: {
      exclude: ['@xenova/transformers'],
    },

    /*server: {
      host: env.TS_HOST || true,
      https: useTls
        ? {
            key: fs.readFileSync(env.TS_CERT_KEY),
            cert: fs.readFileSync(env.TS_CERT_CRT),
          }
        : undefined,
    },*/
  };
});
