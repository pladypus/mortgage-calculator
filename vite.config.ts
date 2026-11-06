import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Served from the root of the custom domain mortgage.pladypus.dev.
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
});
