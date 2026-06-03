// vite-plugin-plausible.ts
//
// Vite plugin that injects the Plausible <script> tag into index.html
// at build time when VITE_PLAUSIBLE_DOMAIN is set.
//
// Why a plugin instead of just putting the tag in index.html directly?
//   • The domain and src URL come from env vars — they can differ per deployment.
//   • When the env var is absent (local dev without analytics) no script is added.
//   • The id="plausible-script" prevents the React usePlausible() hook from
//     double-injecting the script on SPA navigations.
//
// USAGE in vite.config.ts:
//   import { plausiblePlugin } from "./vite-plugin-plausible";
//   plugins: [react(), plausiblePlugin()],

import type { Plugin } from "vite";

export function plausiblePlugin(): Plugin {
  return {
    name: "vite-plugin-plausible",
    transformIndexHtml(html, ctx) {
      const domain = ctx.server
        // dev server: read from process.env directly
        ? process.env.VITE_PLAUSIBLE_DOMAIN
        // build: Vite has already loaded the env file
        : process.env.VITE_PLAUSIBLE_DOMAIN;

      const src =
        process.env.VITE_PLAUSIBLE_SRC ||
        "https://plausible.io/js/script.js";

      const placeholder = "<!-- PLAUSIBLE_INJECT_PLACEHOLDER -->";

      if (!domain || !domain.trim()) {
        // No domain set — strip the placeholder, inject nothing
        return html.replace(placeholder, "<!-- Plausible: set VITE_PLAUSIBLE_DOMAIN to enable -->");
      }

      const tag = `<!-- Plausible Analytics (auto-injected by vite-plugin-plausible) -->
    <script
      id="plausible-script"
      defer
      data-domain="${domain.trim()}"
      src="${src}"
    ></script>`;

      return html.replace(placeholder, tag);
    },
  };
}
