import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path-browserify'; // If you are still using path-browserify
import tailwindcss from 'tailwindcss'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss],
    },
  },
  resolve: {
    alias: {
      path: 'path-browserify', // Use path-browserify if needed
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        sidebar: path.resolve('.', 'index.html'), // Only build the sidebar
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
