import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  let apiProxyTarget = env.VITE_API_PROXY_TARGET;
  if (!apiProxyTarget && env.VITE_API_URL && env.VITE_API_URL.startsWith('http')) {
    try {
      apiProxyTarget = new URL(env.VITE_API_URL).origin;
    } catch (e) {
      // Fallback if URL is invalid
    }
  }
  if (!apiProxyTarget) {
    apiProxyTarget = 'http://127.0.0.1:5000';
  }
  
  return {
    plugins: [react()],
    server: {
      port: 3001,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
        },
        '/uploads': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      sourcemap: env.VITE_BUILD_SOURCE_MAP === 'true',
    },
  };
});
