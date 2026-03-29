import {
  eslint as it4cEslint,
  security,
  comments,
  json,
  yaml,
  css,
  prettier,
  typescript as it4cTypescript,
  vue3 as it4cVue3,
  importX as it4cImportX,
} from 'eslint-config-it4c'

import withNuxt from './.nuxt/eslint.config.mjs'

// it4c ESLint-Basisregeln extrahieren (recommended + custom, kein Plugin/Parser-Overlap mit Nuxt)
const it4cEslintRules = Object.assign({}, ...it4cEslint.map((c) => c.rules))

// it4c TypeScript-Regeln extrahieren (Plugin/Parser-Setup wird von Nuxt via tsconfigPath bereitgestellt)
const it4cTsRules = Object.assign({}, ...it4cTypescript.map((c) => c.rules))

// it4c Vue3-Regeln extrahieren (Plugin/Parser-Setup wird von Nuxt bereitgestellt)
const it4cVue3Rules = Object.assign({}, ...it4cVue3.map((c) => c.rules))

// it4c Import-X-Regeln extrahieren und auf Nuxt-Pluginname `import` umbenennen
const it4cImportRules = Object.fromEntries(
  Object.entries(Object.assign({}, ...it4cImportX.map((c) => c.rules)))
    .filter(([key]) => key.startsWith('import-x/'))
    .map(([key, value]) => [key.replace('import-x/', 'import/'), value]),
)

// no-catch-all gehört nicht ins TypeScript-Modul
delete it4cTsRules['no-catch-all/no-catch-all']

export default withNuxt(
  { ignores: ['.nuxt/', '.claude/', '.output/', 'coverage/', 'eslint.config.ts', 'nuxt.config.ts', 'vitest.config.ts'] },
  // it4c ESLint-Basisregeln
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,vue}'],
    rules: it4cEslintRules,
  },
  {
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  // it4c Vue3-Regeln (nur vue/* Regeln, keine @typescript-eslint)
  {
    files: ['**/*.vue'],
    rules: Object.fromEntries(
      Object.entries(it4cVue3Rules).filter(([key]) => key.startsWith('vue/')),
    ),
  },
  // TypeScript type-checked rules are provided by @nuxt/eslint (strict: true)
  // it4c TS rules are not used here because Nuxt's generated tsconfig scope
  // doesn't cover all .ts files (plugins, constants, tests)
  // it4c Import-Regeln
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,vue}'],
    rules: it4cImportRules,
  },
  {
    rules: {
      'import/no-unresolved': 'off',
      'import/no-named-as-default': 'off',
      'import/no-relative-parent-imports': 'off',
      'import/extensions': 'off',
      'import/no-namespace': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  // it4c-Module (self-contained)
  ...security,
  {
    rules: {
      'security/detect-object-injection': 'off',
    },
  },
  ...comments,
  ...json,
  ...yaml,
  ...css,
  {
    files: ['**/*.css'],
    rules: {
      // text-rendering is valid in @font-face, @source is Tailwind v4
      'css/no-invalid-at-rules': 'off',
      // font-feature-settings: none is valid CSS
      'css/no-invalid-properties': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      // Test helpers use dynamic file paths
      'security/detect-non-literal-fs-filename': 'off',
    },
  },

  // Prettier (MUSS letztes sein)
  ...prettier,
)
  .override('nuxt/javascript', { ignores: ['**/*.css'] })
