import path from "node:path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

// Unit-test config: React components and logic run in jsdom via Testing Library.
// Keep tests hermetic: use mocks instead of real deployments or network calls.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    passWithNoTests: true,
    // Restore Vitest mocks before each test to reduce state leakage.
    restoreMocks: true,
    projects: [
      {
        extends: true,
        plugins: [react()],
        test: {
          name: "frontend",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: ["./src/vitest.setup.ts"],
        },
      },
    ],
  },
});
