import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // Prevents Vite from trying 5174 if 5173 is busy
    open: true, // Automatically opens the browser
  },
});