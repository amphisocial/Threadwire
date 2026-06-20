import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist" },
  // During `npm run dev`, forward API calls to the local FastAPI server.
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
