import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:5101';
  const appBasePath = env.VITE_APP_BASE_PATH || '/';

  return {
    base: appBasePath,
    plugins: [react()],
    server: {
      proxy: {
        '/api': apiProxyTarget
      }
    }
  };
});
