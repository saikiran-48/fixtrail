import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Forward /api to the Express server. The browser sees one origin, so the
    // httpOnly session cookie works without any cross-site cookie setup.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
