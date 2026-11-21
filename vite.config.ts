import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' damit die App auf jedem Hosting (auch GitHub Pages) funktioniert
export default defineConfig({
  base: './',
  plugins: [react()],
});
