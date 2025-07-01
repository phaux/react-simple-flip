/// <reference types="@vitest/browser/providers/playwright" />
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

export default defineConfig({
  plugins: [react(), dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: import.meta.dirname + "/src/index.tsx",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: ["react", "react/jsx-runtime"],
    },
    minify: false,
  },
  test: {
    browser: {
      enabled: true,
      provider: "playwright",
      instances: [{ browser: "chromium" }],
      headless: true,
    },
    coverage: {
      enabled: true,
      reporter: ["lcov"],
    },
    watch: false,
  },
})
