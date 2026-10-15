import { defineConfig } from 'vite';
import { offline } from './offline/vite-offline';
import pkg from './package.json';

export default defineConfig({
  plugins: [offline('mcl-arcade')],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
});
