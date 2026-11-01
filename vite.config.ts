import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // In development the admin panel calls the API on its own address (/v1/..., /icons/...)
  // and Vite forwards those calls to the API. Deploys call the API address (VITE_API_URL).
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:4000';

  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5173,
      proxy: {
        '/v1': { target: apiTarget, changeOrigin: true },
        '/icons': { target: apiTarget, changeOrigin: true },
      },
    },
  };
});
