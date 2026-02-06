import config, { vue3, vitest } from 'eslint-config-it4c'

export default [
  ...config,
  ...vue3,
  ...vitest,
  {
    ignores: ['dist/', 'coverage/', 'node_modules/', 'examples/'],
  },
  {
    rules: {
      // Extends eslint-config-it4c rule: keep .json exception, add .css/.scss
      'n/file-extension-in-import': [
        'error',
        'never',
        {
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
