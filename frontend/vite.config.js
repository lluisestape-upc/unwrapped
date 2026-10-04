import { defineConfig } from 'vite';

export default defineConfig({
  // Pages serves this from /<repo>/, not from the domain root, so every asset
  // reference has to be relative or it resolves to the wrong place.
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/cache': 'http://127.0.0.1:8000',
    },
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    // The game, and the asset board for the submission.
    rollupOptions: { input: { main: 'index.html', board: 'board.html' } },
  },
});
