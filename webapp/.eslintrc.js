module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    jest: true,
  },
  parserOptions: {
    parser: 'babel-eslint',
  },
  extends: ['standard', 'plugin:vue/essential', 'plugin:prettier/recommended'],
  // required to lint *.vue files
  plugins: ['vue', 'prettier', 'jest'],
  // add your custom rules here
  rules: {
    // 'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-console': ['error'],
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'vue/component-name-in-template-casing': ['error', 'kebab-case'],
    // deactivate Vue3 rules for now, project will be migrated to Vue3
    'vue/multi-word-component-names': 0,
    'vue/no-mutating-props': 0,
    'vue/no-v-text-v-html-on-component': 0,
    'prettier/prettier': [
      'error',
      {
        htmlWhitespaceSensitivity: 'ignore',
      },
    ],
    // 'newline-per-chained-call': [2]
  },
  overrides: [
    {
      // NAMING LOCK: test files are `*.spec.*` across the whole repo. Both suffixes used to be picked
      // up (and jest.config.js testMatch still accepts either — DELIBERATELY, so a mis-named file
      // fails loudly here instead of being silently skipped), which is how the auth store once
      // carried TWO half-overlapping suites — an auth.test.js beside auth.spec.js, since merged.
      files: ['**/*.test.js', '**/*.test.jsx', '**/*.test.vue'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: 'Program',
            message: 'Rename this file to *.spec.* — test files use the .spec suffix in this repo.',
          },
        ],
      },
    },
  ],
}
