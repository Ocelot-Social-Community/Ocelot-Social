// TODO: Update eslint-config-it4c to support ESLint 10 (currently incompatible)
import config, { vue3, vitest } from 'eslint-config-it4c'
import jsdocPlugin from 'eslint-plugin-jsdoc'
import playwrightPlugin from 'eslint-plugin-playwright'
import storybookPlugin from 'eslint-plugin-storybook'
import vuejsAccessibilityPlugin from 'eslint-plugin-vuejs-accessibility'

export default [
  {
    ignores: [
      'dist/',
      'coverage/',
      'storybook-static/',
      '**/node_modules/',
      'examples/',
      'test-results/',
      'playwright-report/',
    ],
  },
  ...config,
  ...vue3,
  ...vitest,
  {
    // TODO: Move these Vue-standard rules to eslint-config-it4c
    rules: {
      // TODO(it4c): Add .css/.scss to vue3 config
      'n/file-extension-in-import': [
        'error',
        'never',
        {
          '.vue': 'always',
          '.json': 'always',
          '.css': 'always',
          '.scss': 'always',
        },
      ],
      // TODO(it4c): Add CSS/SCSS exception to vue3 config
      'import-x/no-unassigned-import': [
        'error',
        {
          allow: ['**/*.css', '**/*.scss'],
        },
      ],
      // TODO(it4c): Disable in vue3 config (alias imports)
      'import-x/no-relative-parent-imports': 'off',
      // TODO(it4c): Disable in vue3 config (Prettier handles)
      'vue/max-attributes-per-line': 'off',
    },
  },
  {
    // Disable TypeScript rules for JSON files
    files: ['**/*.json'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
  {
    // TODO: Move these Vitest rules to eslint-config-it4c vitest config
    files: ['**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      // TODO(it4c): Add to vitest config (standard pattern)
      'vitest/consistent-test-filename': ['error', { pattern: '.*\\.spec\\.[tj]sx?$' }],
      // TODO(it4c): Disable in vitest config
      'vitest/prefer-expect-assertions': 'off',
      // TODO(it4c): Disable in vitest config
      'vitest/no-hooks': 'off',
    },
  },
  {
    // CLI scripts - allow sync methods and console
    files: ['scripts/**/*.ts'],
    rules: {
      'n/shebang': 'off',
      'n/no-sync': 'off',
      'no-console': 'off',
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
  {
    // Playwright visual tests
    files: ['**/*.visual.spec.ts'],
    ...playwrightPlugin.configs['flat/recommended'],
    rules: {
      ...playwrightPlugin.configs['flat/recommended'].rules,
      'n/no-process-env': 'off',
      'vitest/require-hook': 'off',
    },
  },
  {
    // Playwright config
    files: ['playwright.config.ts'],
    rules: {
      'n/no-process-env': 'off',
    },
  },
  // Storybook files
  // eslint-disable-next-line import-x/no-named-as-default-member -- flat config access pattern
  ...storybookPlugin.configs['flat/recommended'],
  {
    // Vue components - accessibility and JSDoc
    files: ['src/components/**/*.vue'],
    plugins: {
      jsdoc: jsdocPlugin,
      'vuejs-accessibility': vuejsAccessibilityPlugin,
    },
    rules: {
      // Require JSDoc comments on Props interface properties
      'jsdoc/require-jsdoc': [
        'error',
        {
          contexts: ['TSPropertySignature'],
          require: {
            ClassDeclaration: false,
            ClassExpression: false,
            ArrowFunctionExpression: false,
            FunctionDeclaration: false,
            FunctionExpression: false,
            MethodDefinition: false,
          },
        },
      ],
      // Accessibility rules
      ...vuejsAccessibilityPlugin.configs.recommended.rules,
    },
  },
]
