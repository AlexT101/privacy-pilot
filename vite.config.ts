import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path-browserify'; // If you are still using path-browserify

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      path: 'path-browserify', // Use path-browserify if needed
    },
  },
  build: {
    rollupOptions: {
      input: {
        sidebar: path.resolve('.', 'sidebar.html'), // Only build the sidebar
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
