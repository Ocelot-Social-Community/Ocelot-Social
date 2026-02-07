import config, { vue3, vitest } from 'eslint-config-it4c'

export default [
  ...config,
  ...vue3,
  ...vitest,
  { ignores: ['dist/', 'node_modules/'] },
  {
    rules: {
      'n/file-extension-in-import': ['error', 'never', { '.vue': 'always', '.json': 'always', '.css': 'always' }],
    },
  },
  {
    files: ['**/*.json'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      'vitest/consistent-test-filename': ['error', { pattern: '.*\\.spec\\.[tj]sx?$' }],
      'vitest/prefer-expect-assertions': 'off',
      'vitest/no-hooks': 'off',
    },
  },
]
