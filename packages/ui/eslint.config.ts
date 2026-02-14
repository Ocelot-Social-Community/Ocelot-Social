import config, { css, vue3, vitest as vitests } from 'eslint-config-it4c'
import jsdocPlugin from 'eslint-plugin-jsdoc'
import playwrightPlugin from 'eslint-plugin-playwright'
import storybookPlugin from 'eslint-plugin-storybook'
import vuejsAccessibilityPlugin from 'eslint-plugin-vuejs-accessibility'
import { tailwind4 } from 'tailwind-csstree'

/** Turn off all vitest rules (for use in Playwright test overrides) */
const vitestRulesOff = Object.fromEntries(
  Object.keys(vitests[0]?.rules ?? {}).map((rule) => [rule, 'off']),
)

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
  ...vitests,
  {
    // TODO: fix in eslint-config-it4c — these rules conflict with each other
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      'vitest/valid-title': 'off', // conflicts with vitest/prefer-describe-function-title
      'vitest/expect-expect': ['warn', { assertFunctionNames: ['expect', 'expectTypeOf'] }],
    },
  },
  {
    // Playwright visual tests (not vitest — disable all vitest rules)
    files: ['**/*.visual.spec.ts'],
    ...playwrightPlugin.configs['flat/recommended'],
    rules: {
      ...vitestRulesOff,
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
