import path from "path";

import { defineVitestConfig } from "@nuxt/test-utils/config";

export default defineVitestConfig({
  root: path.resolve(__dirname),
  test: {
    environment: "nuxt",
    include: ["app/**/*.spec.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
      all: true,
      include: ["app/**/*.{ts,vue}"],
      exclude: ["app/**/*.spec.ts"],
      thresholds: {
        100: true,
      },
    },
  },
});
