import { defineConfig } from "vitest/config";

// A demo vive em demo/ e é servida pelo Vite; o motor (src/) é importado direto do código-fonte.
export default defineConfig({
  root: "demo",
  base: "./",
  build: { outDir: "../dist", emptyOutDir: true, target: "es2022" },
  worker: { format: "es" },
  test: { root: ".", include: ["test/**/*.test.ts"], environment: "node" },
});
