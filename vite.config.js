import { defineConfig } from 'vite';
import { copyFileSync } from 'fs';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
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
