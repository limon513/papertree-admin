import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // The admin panel calls the API on the same address (/v1/...). In development
  // Vite forwards those calls to the API; in the demo deploy Vercel does the same.
  // Same-address calls keep the session cookie simple and safe.
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:4000';

  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5173,
      proxy: {
        '/v1': { target: apiTarget, changeOrigin: true },
      },
    },
  };
});
