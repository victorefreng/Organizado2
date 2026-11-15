import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: false, host: '127.0.0.1' },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'index.html'),
        output: resolve(__dirname, 'output.html')
      }
    }
  }
});
