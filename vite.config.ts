import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  publicDir: false,
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { outDir: '../dist', emptyOutDir: true },
  // In development the eventgrain API is proxied so the browser sees one origin.
  server: { proxy: { '/api': process.env['EVENTGRAIN_URL'] ?? 'http://127.0.0.1:4200' } },
});
