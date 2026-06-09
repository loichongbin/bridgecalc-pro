import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base URL: '/' for local dev, '/bridgecalc-pro/' for GitHub Pages production
const base = process.env.NODE_ENV === 'production' ? '/bridgecalc-pro/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
});
