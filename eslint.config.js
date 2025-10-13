import eslint from "@eslint/js"
import { defineConfig } from "eslint/config"
import reactHooks from "eslint-plugin-react-hooks"
import tseslint from "typescript-eslint"

export default defineConfig(
  {
    ignores: ["*.config.*", "dist/**", "coverage/**"],
  },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
)
