import config, { css, vue3, vitest } from 'eslint-config-it4c'
import jsdocPlugin from 'eslint-plugin-jsdoc'
import playwrightPlugin from 'eslint-plugin-playwright'
import storybookPlugin from 'eslint-plugin-storybook'
import vuejsAccessibilityPlugin from 'eslint-plugin-vuejs-accessibility'
import { tailwind4 } from 'tailwind-csstree'

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
    rules: {
      // TODO: replace with alias
      'import-x/no-relative-parent-imports': 'off',
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
  ...css,
  {
    // Extend CSS config with Tailwind v4 syntax support
    files: ['**/*.css'],
    languageOptions: {
      customSyntax: tailwind4,
    },
  },
]
