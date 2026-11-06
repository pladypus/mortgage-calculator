import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from the root of the custom domain mortgage.pladypus.dev.
export default defineConfig({
  base: "/",
  plugins: [react()],
});
