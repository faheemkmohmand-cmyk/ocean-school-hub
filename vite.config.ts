import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// ✅ FIX 2: vite-plugin-pwa generates a Service Worker + offline cache automatically.
// Install first:  npm install -D vite-plugin-pwa
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),

    // ✅ FIX 2: PWA plugin — auto-generates SW with Workbox precaching
    VitePWA({
      registerType: "autoUpdate",           // SW updates silently in background
      injectRegister: "auto",               // Injects registration script automatically
      includeAssets: [
        "favicon.svg",
        "favicon-16.png",
        "favicon-32.png",
        "apple-touch-icon.png",
        "og-image.jpg",
      ],
      manifest: false,                      // We have our own /public/manifest.json
      workbox: {
        // Precache all built assets (JS, CSS, HTML)
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Runtime cache strategies for external requests
        runtimeCaching: [
          {
            // Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Google Fonts files
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Supabase REST API — NetworkFirst so data is always fresh,
            // but falls back to cache when offline
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
            },
          },
          {
            // Cloudinary images — CacheFirst (images rarely change)
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "cloudinary-images",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // OpenWeatherMap — StaleWhileRevalidate (weather can be slightly stale)
            urlPattern: /^https:\/\/api\.openweathermap\.org\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "weather-api",
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 30 },
            },
          },
        ],
      },
      devOptions: {
        // Show SW in dev for testing — set to false to disable in local dev
        enabled: false,
      },
    }),
  ].filter(Boolean),

  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },

  build: {
    target: "es2020",
    minify: "esbuild",
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react":    ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-query":    ["@tanstack/react-query"],
          "vendor-motion":   ["framer-motion"],
          "vendor-ui":       ["lucide-react", "react-hot-toast"],
          "vendor-utils":    ["date-fns", "clsx", "tailwind-merge"],
          "vendor-xlsx":     ["xlsx"],
          "vendor-pdf":      ["jspdf", "jspdf-autotable"],
          "vendor-charts":   ["recharts"],
        },
        chunkFileNames:  "assets/[name]-[hash].js",
        entryFileNames:  "assets/[name]-[hash].js",
        assetFileNames:  "assets/[name]-[hash].[ext]",
      },
    },
    chunkSizeWarningLimit: 600,
    sourcemap: mode === "development",
    reportCompressedSize: true,
  },
}));
