import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from the root of the custom domain mortgages.pladypus.dev.
export default defineConfig({
  base: "/",
  plugins: [react()],
});
