import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // The integration suite shares one PostgreSQL database, so run files
    // sequentially to keep fixtures and assertions deterministic.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": root,
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
      "next/headers": fileURLToPath(new URL("./tests/stubs/next-headers.ts", import.meta.url)),
    },
  },
});
