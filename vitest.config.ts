import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts", "packages/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/app/lib": path.resolve(__dirname, "./src/app/lib"),
      "@woodland/core": path.resolve(__dirname, "./packages/woodland/src/index.ts"),
    },
  },
});
