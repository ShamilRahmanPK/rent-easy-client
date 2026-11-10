import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The API runs on port 4000 (override with API_URL). Proxying keeps the browser on one origin, so the login cookie just works.
const apiTarget = process.env.API_URL ?? "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  // The map library is large but loads only on map screens, so the size warning does not matter.
  build: { chunkSizeWarningLimit: 1200 },
  // Pre-bundle the map library at start-up, so the first map screen does not trigger a re-optimise and a failed worker load.
  optimizeDeps: { include: ["maplibre-gl"] },
  server: {
    port: 5173,
    proxy: {
      "/api": apiTarget,
      "/uploads": apiTarget,
    },
  },
});
