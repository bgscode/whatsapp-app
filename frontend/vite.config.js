import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
// import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "../build",
    emptyOutDir: true,
    sourcemap: true,
  },
});
