// Standalone Vite config for the scene dev harness ONLY. Not used by the main
// app build (root vite.config.ts, owned by nobody, is untouched). Run with:
//   npx vite --config src/scene/__dev__/vite.config.ts
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  resolve: {
    alias: { '~': path.resolve(__dirname, '../../') },
  },
});
