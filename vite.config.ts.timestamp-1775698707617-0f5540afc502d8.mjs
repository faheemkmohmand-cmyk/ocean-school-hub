// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///home/project/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__vite_injected_original_dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"]
  },
  build: {
    target: "es2020",
    minify: "esbuild",
    assetsInlineLimit: 4096,
    // ✅ Enable CSS code splitting — each page loads only its CSS
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-motion": ["framer-motion"],
          "vendor-ui": ["lucide-react", "react-hot-toast"],
          "vendor-utils": ["date-fns", "clsx", "tailwind-merge"],
          // ✅ Heavy libs in separate chunks — loaded only when needed
          "vendor-xlsx": ["xlsx"],
          "vendor-pdf": ["jspdf", "jspdf-autotable"],
          "vendor-charts": ["recharts"]
        },
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]"
      }
    },
    chunkSizeWarningLimit: 600,
    sourcemap: mode === "development",
    // ✅ Report compressed sizes to understand real transfer size
    reportCompressedSize: true
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogXCI6OlwiLFxuICAgIHBvcnQ6IDgwODAsXG4gICAgaG1yOiB7IG92ZXJsYXk6IGZhbHNlIH0sXG4gIH0sXG4gIHBsdWdpbnM6IFtyZWFjdCgpLCBtb2RlID09PSBcImRldmVsb3BtZW50XCIgJiYgY29tcG9uZW50VGFnZ2VyKCldLmZpbHRlcihCb29sZWFuKSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7IFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpIH0sXG4gICAgZGVkdXBlOiBbXCJyZWFjdFwiLCBcInJlYWN0LWRvbVwiLCBcInJlYWN0L2pzeC1ydW50aW1lXCIsIFwicmVhY3QvanN4LWRldi1ydW50aW1lXCJdLFxuICB9LFxuICBidWlsZDoge1xuICAgIHRhcmdldDogXCJlczIwMjBcIixcbiAgICBtaW5pZnk6IFwiZXNidWlsZFwiLFxuICAgIGFzc2V0c0lubGluZUxpbWl0OiA0MDk2LFxuICAgIC8vIFx1MjcwNSBFbmFibGUgQ1NTIGNvZGUgc3BsaXR0aW5nIFx1MjAxNCBlYWNoIHBhZ2UgbG9hZHMgb25seSBpdHMgQ1NTXG4gICAgY3NzQ29kZVNwbGl0OiB0cnVlLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICBcInZlbmRvci1yZWFjdFwiOiBbXCJyZWFjdFwiLCBcInJlYWN0LWRvbVwiLCBcInJlYWN0LXJvdXRlci1kb21cIl0sXG4gICAgICAgICAgXCJ2ZW5kb3Itc3VwYWJhc2VcIjogW1wiQHN1cGFiYXNlL3N1cGFiYXNlLWpzXCJdLFxuICAgICAgICAgIFwidmVuZG9yLXF1ZXJ5XCI6IFtcIkB0YW5zdGFjay9yZWFjdC1xdWVyeVwiXSxcbiAgICAgICAgICBcInZlbmRvci1tb3Rpb25cIjogW1wiZnJhbWVyLW1vdGlvblwiXSxcbiAgICAgICAgICBcInZlbmRvci11aVwiOiBbXCJsdWNpZGUtcmVhY3RcIiwgXCJyZWFjdC1ob3QtdG9hc3RcIl0sXG4gICAgICAgICAgXCJ2ZW5kb3ItdXRpbHNcIjogW1wiZGF0ZS1mbnNcIiwgXCJjbHN4XCIsIFwidGFpbHdpbmQtbWVyZ2VcIl0sXG4gICAgICAgICAgLy8gXHUyNzA1IEhlYXZ5IGxpYnMgaW4gc2VwYXJhdGUgY2h1bmtzIFx1MjAxNCBsb2FkZWQgb25seSB3aGVuIG5lZWRlZFxuICAgICAgICAgIFwidmVuZG9yLXhsc3hcIjogW1wieGxzeFwiXSxcbiAgICAgICAgICBcInZlbmRvci1wZGZcIjogW1wianNwZGZcIiwgXCJqc3BkZi1hdXRvdGFibGVcIl0sXG4gICAgICAgICAgXCJ2ZW5kb3ItY2hhcnRzXCI6IFtcInJlY2hhcnRzXCJdLFxuICAgICAgICB9LFxuICAgICAgICBjaHVua0ZpbGVOYW1lczogXCJhc3NldHMvW25hbWVdLVtoYXNoXS5qc1wiLFxuICAgICAgICBlbnRyeUZpbGVOYW1lczogXCJhc3NldHMvW25hbWVdLVtoYXNoXS5qc1wiLFxuICAgICAgICBhc3NldEZpbGVOYW1lczogXCJhc3NldHMvW25hbWVdLVtoYXNoXS5bZXh0XVwiLFxuICAgICAgfSxcbiAgICB9LFxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogNjAwLFxuICAgIHNvdXJjZW1hcDogbW9kZSA9PT0gXCJkZXZlbG9wbWVudFwiLFxuICAgIC8vIFx1MjcwNSBSZXBvcnQgY29tcHJlc3NlZCBzaXplcyB0byB1bmRlcnN0YW5kIHJlYWwgdHJhbnNmZXIgc2l6ZVxuICAgIHJlcG9ydENvbXByZXNzZWRTaXplOiB0cnVlLFxuICB9LFxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLG9CQUFvQjtBQUN0UCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBSGhDLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sS0FBSyxFQUFFLFNBQVMsTUFBTTtBQUFBLEVBQ3hCO0FBQUEsRUFDQSxTQUFTLENBQUMsTUFBTSxHQUFHLFNBQVMsaUJBQWlCLGdCQUFnQixDQUFDLEVBQUUsT0FBTyxPQUFPO0FBQUEsRUFDOUUsU0FBUztBQUFBLElBQ1AsT0FBTyxFQUFFLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU8sRUFBRTtBQUFBLElBQy9DLFFBQVEsQ0FBQyxTQUFTLGFBQWEscUJBQXFCLHVCQUF1QjtBQUFBLEVBQzdFO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsSUFDUixtQkFBbUI7QUFBQTtBQUFBLElBRW5CLGNBQWM7QUFBQSxJQUNkLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxVQUNaLGdCQUFnQixDQUFDLFNBQVMsYUFBYSxrQkFBa0I7QUFBQSxVQUN6RCxtQkFBbUIsQ0FBQyx1QkFBdUI7QUFBQSxVQUMzQyxnQkFBZ0IsQ0FBQyx1QkFBdUI7QUFBQSxVQUN4QyxpQkFBaUIsQ0FBQyxlQUFlO0FBQUEsVUFDakMsYUFBYSxDQUFDLGdCQUFnQixpQkFBaUI7QUFBQSxVQUMvQyxnQkFBZ0IsQ0FBQyxZQUFZLFFBQVEsZ0JBQWdCO0FBQUE7QUFBQSxVQUVyRCxlQUFlLENBQUMsTUFBTTtBQUFBLFVBQ3RCLGNBQWMsQ0FBQyxTQUFTLGlCQUFpQjtBQUFBLFVBQ3pDLGlCQUFpQixDQUFDLFVBQVU7QUFBQSxRQUM5QjtBQUFBLFFBQ0EsZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCO0FBQUEsTUFDbEI7QUFBQSxJQUNGO0FBQUEsSUFDQSx1QkFBdUI7QUFBQSxJQUN2QixXQUFXLFNBQVM7QUFBQTtBQUFBLElBRXBCLHNCQUFzQjtBQUFBLEVBQ3hCO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
