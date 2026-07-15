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
        home: resolve(__dirname, 'index.html'),
        fusee: resolve(__dirname, 'petite-fusee.html'),
        machines: resolve(__dirname, 'petites-machines.html'),
        animals: resolve(__dirname, 'petits-animaux.html'),
      },
    },
  },
  closeBundle() {
    try {
      copyFileSync('vercel.json', 'dist/vercel.json');
    } catch {}
  },
});
