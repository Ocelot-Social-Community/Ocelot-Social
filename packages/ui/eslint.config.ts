import config, { vue3, vitest } from 'eslint-config-it4c'

export default [
  { ignores: ['dist/', 'coverage/', 'storybook-static/', '**/node_modules/', 'examples/'] },
  ...config,
  ...vue3,
  ...vitest,
  {
    rules: {
      // Extends eslint-config-it4c rule: keep .json exception, add .css/.scss
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
      // Allow CSS/SCSS side-effect imports
      'import-x/no-unassigned-import': [
        'error',
        {
          allow: ['**/*.css', '**/*.scss'],
        },
      ],
      // Allow @/ alias imports (not actually relative parent imports)
      'import-x/no-relative-parent-imports': 'off',
      // Let prettier handle attribute formatting
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
    // Vitest test file conventions
    files: ['**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      'vitest/consistent-test-filename': ['error', { pattern: '.*\\.spec\\.[tj]sx?$' }],
      'vitest/prefer-expect-assertions': 'off',
      'vitest/no-hooks': 'off',
    },
  },
]
