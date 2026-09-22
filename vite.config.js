import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  // The unit JSON is bundled on purpose (static site, no fetch).
  build: { chunkSizeWarningLimit: 1500 },
});
