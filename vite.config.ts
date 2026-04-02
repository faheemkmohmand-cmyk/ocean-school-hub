import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    // ✅ Target modern browsers — smaller, faster output
    target: "es2020",
    // ✅ Minify with esbuild (faster than terser, built-in)
    minify: "esbuild",
    // ✅ Inline tiny assets as base64 — saves HTTP round trips
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        // ✅ Finer chunks — only load what each page needs
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-motion": ["framer-motion"],
          "vendor-ui": ["lucide-react", "react-hot-toast"],
          "vendor-utils": ["date-fns", "clsx", "tailwind-merge"],
        },
        // ✅ Content-hash filenames → perfect long-term browser caching
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    chunkSizeWarningLimit: 600,
    // ✅ Generate sourcemaps only in dev
    sourcemap: mode === "development",
  },
}));
