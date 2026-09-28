import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const port = Number(process.env.PORT) || 5173;

// Relative base: the build runs from any path, e.g. https://<user>.github.io/<repo>/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, port }, // host: reachable from phones on the same network during dev
  preview: { host: true, port },
});
