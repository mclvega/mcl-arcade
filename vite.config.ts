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
    // three.js en su propio archivo: el navegador lo guarda entre versiones del juego.
    rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'three', test: /node_modules[\/]three/ }] } } },
  },
});
