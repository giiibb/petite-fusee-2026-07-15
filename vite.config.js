import { defineConfig } from 'vite';
import { copyFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'petite-fusee': resolve(__dirname, 'petite-fusee.html'),
        'petites-machines': resolve(__dirname, 'petites-machines.html'),
      },
    },
  },
  plugins: [
    {
      name: 'copy-vercel-json',
      closeBundle() {
        copyFileSync('vercel.json', 'dist/vercel.json');
      },
    },
  ],
});
