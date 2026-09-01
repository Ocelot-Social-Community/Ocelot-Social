// Flat config (ESLint 10). Replaces .eslintrc.js + .eslintignore, which the eslintrc format's removal
// in ESLint 10 made unusable. The rule set is deliberately the same one the eslintrc had:
//
//   standard + plugin:vue/essential + plugin:prettier/recommended
//
// minus `eslint-config-standard`, whose entire chain (eslint-config-standard, eslint-plugin-standard,
// eslint-plugin-node, eslint-plugin-import, babel-eslint) never gained flat-config/ESLint 9+ support.
// What standard actually contributed beyond Prettier's formatting is covered by `js.configs.recommended`
// here; the `import/*` and `global-require` rules it is often assumed to bring were NOT enabled by it
// (verified with --report-unused-disable-directives: every `eslint-disable` for them was already dead),
// so no rule coverage is lost by dropping those plugins.
//
// The rest of the repo (backend, maintenance, packages/*) lints with `eslint-config-it4c`. The webapp
// cannot adopt it yet: its `vue2` module runs the typescript-eslint `strict` set over `.vue` files,
// which this 208-component plain-JS Vue 2 app would answer with a flood of findings. Converging is a
// separate piece of work — best done with the Vue 3 migration.
import js from '@eslint/js'
import pluginJest from 'eslint-plugin-jest'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  {
    // Former .eslintignore. `coverage/` is new here: it holds generated report scripts that only
    // exist after a local `npm test`, so linting them fails on the developer's machine and nowhere else.
    ignores: [
      'node_modules/',
      'dist/',
      '.nuxt/',
      'coverage/',
      'storybook-static/',
      'test-results/',
      'playwright-report/',
      '**/*.min.js',
      'static/sw.js',
    ],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/vue2-essential'],
  // Must stay after the vue configs: it switches off the formatting rules they re-enable.
  prettierRecommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // The options `eslint-config-standard` used to set. Without them the ESLint 9 defaults apply,
      // which report every unused `catch (err)` binding and every unused function parameter — 124
      // findings in this codebase, none of them a change in the code's quality.
      'no-unused-vars': [
        'error',
        { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true, vars: 'all' },
      ],
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
    },
  },
  {
    // Jest globals. The eslintrc set `env: { jest: true }` for every file; scoped here to the files
    // that actually run under Jest — a stray `jest.fn()` in app code is then an undefined variable.
    // `*spec.js` rather than `*.spec.js`: components/DateTime/spec.js is named without a prefix, and
    // jest's testMatch picks it up all the same.
    files: ['**/*spec.js', 'test/**/*.js', '**/__mocks__/**/*.js'],
    plugins: { jest: pluginJest },
    languageOptions: { globals: pluginJest.environments.globals.globals },
  },
  {
    // The eslintrc registered eslint-plugin-jest but enabled none of its rules. Its recommended set
    // costs seven fixes and catches things no other rule does — an `expect()` with no matcher asserts
    // nothing at all, and it sat in three tests here. `no-commented-out-tests` stays at its default
    // `warn`: the 21 hits are disabled tests that each need a decision (revive or delete), which is
    // not this migration's job.
    files: ['**/*spec.js'],
    ...pluginJest.configs['flat/recommended'],
  },
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
]
