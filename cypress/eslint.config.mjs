import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import pluginCypress from 'eslint-plugin-cypress/flat'


export default defineConfig([
  pluginCypress.configs.globals,
  pluginCypress.configs.recommended,
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"] },
  { files: ["**/*.{js,mjs,cjs}"], languageOptions: { globals: globals.browser } },
  {
    plugins: {
			cypress: pluginCypress
		},
  }

]);