import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures correct asset paths for deployment
  build: {
    rollupOptions: {
      // No external dependencies to prevent "Failed to resolve module specifier" errors
    },
  },
});
