import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";

// Sub-folder the site is served from, e.g. "/owlbear-campana/" on GitHub Pages.
const base = process.env.BASE_PATH ?? "/";

// Owlbear Rodeo rejects relative manifest paths ("Invalid URL"), so the manifest
// uses root paths ("/", "/icon.svg") and the build prefixes them with the base.
function manifestBase() {
  return {
    name: "manifest-base",
    apply: "build",
    writeBundle({ dir }) {
      if (base === "/") return;
      const file = join(dir, "manifest.json");
      const manifest = JSON.parse(readFileSync(file, "utf8"));
      const withBase = (path) => base + path.replace(/^\//, "");
      manifest.action.icon = withBase(manifest.action.icon);
      manifest.action.popover = withBase(manifest.action.popover);
      writeFileSync(file, JSON.stringify(manifest, null, 2) + "\n");
    },
  };
}

export default defineConfig({
  base,
  plugins: [manifestBase()],
  server: {
    // Owlbear Rodeo loads the dev server from its own origin.
    cors: { origin: "https://www.owlbear.rodeo" },
  },
});
