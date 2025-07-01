import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      // Use esbuild for faster builds and better CSP compatibility
      minify: 'esbuild' as const,
      // Ensure proper chunking for production
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
    // Configure for production deployment
    base: '/',
  }
})