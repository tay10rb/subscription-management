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
      // Disable minification that might cause CSP issues
      minify: 'terser',
      terserOptions: {
        compress: {
          // Disable eval usage
          unsafe_eval: false,
        },
      },
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