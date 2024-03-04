module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    jest: true
  },
  parserOptions: {
    parser: 'babel-eslint'
  },
  extends: [
    'standard',
    'plugin:vue/essential',
    'plugin:prettier/recommended'
  ],
  // required to lint *.vue files
  plugins: [
    'vue',
    'prettier',
    'jest'
  ],
  // add your custom rules here
  rules: {
    //'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-console': ['error'],
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'vue/component-name-in-template-casing': ['error', 'kebab-case'],
    // deactivate Vue3 rules for now, project will be migrated to Vue3
    'vue/multi-word-component-names': 0,
    'vue/no-mutating-props': 0,
    'vue/no-v-text-v-html-on-component': 0,
    'prettier/prettier': ['error', {
      htmlWhitespaceSensitivity: 'ignore'
    }],
    // 'newline-per-chained-call': [2]
  }
}
