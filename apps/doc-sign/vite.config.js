import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    alias: {
      react: path.resolve(root, 'node_modules/react'),
      'react-dom': path.resolve(root, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(root, 'node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(root, 'node_modules/react/jsx-dev-runtime.js'),
      '@kunk/config': path.resolve(root, 'packages/config/src/index.js'),
      '@kunk/api-client': path.resolve(root, 'packages/api-client/src/index.js'),
      '@kunk/auth-session': path.resolve(root, 'packages/auth-session/src/index.jsx'),
      '@kunk/theme': path.resolve(root, 'packages/theme/src/index.js'),
      '@kunk/ui': path.resolve(root, 'packages/ui/src/index.jsx'),
      'web-vitals': path.resolve(root, 'node_modules/web-vitals'),
    },
  },
  server: {
    host: true,
    port: 4258,
    watch: { usePolling: true, interval: 1000 },
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:4250',
        changeOrigin: true,
      },
    },
  },
});
