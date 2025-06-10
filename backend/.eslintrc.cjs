// eslint-disable-next-line import/no-commonjs
module.exports = {
  root: true,
  env: {
    node: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['prettier', '@typescript-eslint', 'import', 'n', 'promise', 'security', 'no-catch-all'],
  extends: [
    'standard',
    'eslint:recommended',
    'plugin:n/recommended',
    'plugin:prettier/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:promise/recommended',
    'plugin:security/recommended-legacy',
    'plugin:@eslint-community/eslint-comments/recommended',
    'prettier',
  ],
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      typescript: {
        project: ['./tsconfig.json', './backend/tsconfig.json'],
      },
      node: true,
    },
  },
  rules: {
    'no-catch-all/no-catch-all': 'error',
    'no-console': 'error',
    camelcase: 'error',
    'no-debugger': 'error',
    'prettier/prettier': [
      'error',
      {
        htmlWhitespaceSensitivity: 'ignore',
      },
    ],
    // import
    'import/export': 'error',
    // 'import/no-deprecated': 'error',
    'import/no-empty-named-blocks': 'error',
    'import/no-extraneous-dependencies': 'error',
    'import/no-mutable-exports': 'error',
    'import/no-unused-modules': 'error',
    'import/no-named-as-default': 'error',
    'import/no-named-as-default-member': 'error',
    'import/no-amd': 'error',
    'import/no-commonjs': 'error',
    'import/no-import-module-exports': 'error',
    'import/no-nodejs-modules': 'off',
    'import/unambiguous': 'off', // not compatible with .eslintrc.cjs
    'import/default': 'error',
    'import/named': 'off', // has false positives
    'import/namespace': 'error',
    'import/no-absolute-path': 'error',
    'import/no-cycle': 'error',
    'import/no-dynamic-require': 'error',
    'import/no-internal-modules': 'off',
    'import/no-relative-packages': 'error',
    'import/no-relative-parent-imports': ['error', { ignore: ['@/*'] }],
    'import/no-self-import': 'error',
    'import/no-unresolved': 'error',
    'import/no-useless-path-segments': 'error',
    'import/no-webpack-loader-syntax': 'error',
    'import/consistent-type-specifier-style': 'error',
    'import/exports-last': 'off',
    'import/extensions': 'error',
    'import/first': 'error',
    'import/group-exports': 'off',
    'import/newline-after-import': 'error',
    'import/no-anonymous-default-export': 'off', // not compatible with neode
    'import/no-default-export': 'off', // not compatible with neode
    'import/no-duplicates': 'error',
    'import/no-named-default': 'error',
    'import/no-namespace': 'error',
    'import/no-unassigned-import': 'error',
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
        'newlines-between': 'always',
        pathGroups: [
          {
            pattern: '@?*/**',
            group: 'external',
            position: 'after',
          },
          {
            pattern: '@/**',
            group: 'external',
            position: 'after',
          },
        ],
        alphabetize: {
          order: 'asc' /* sort in ascending order. Options: ['ignore', 'asc', 'desc'] */,
          caseInsensitive: true /* ignore case. Options: [true, false] */,
        },
        distinctGroup: true,
      },
    ],
    'import/prefer-default-export': 'off',

    // n
    // 'n/callback-return': 'error',
    'n/exports-style': 'error',
    'n/file-extension-in-import': ['error', 'never'],
    'n/global-require': 'error',
    'n/handle-callback-err': 'error',
    // 'n/hashbang': 'error', // part of n/recommended
    'n/no-callback-literal': 'error',
    // 'n/no-deprecated-api': 'error', // part of n/recommended
    // 'n/no-exports-assign': 'error', // part of n/recommended
    'n/no-extraneous-import': 'off', // duplicate of import/no-extraneous-dependencies // part of n/recommended
    // 'n/no-extraneous-require': 'error', // part of n/recommended
    'n/no-hide-core-modules': 'error',
    'n/no-missing-import': 'off', // not compatible with typescript // part of n/recommended
    // 'n/no-missing-require': 'error', // part of n/recommended
    'n/no-mixed-requires': 'error',
    'n/no-new-require': 'error',
    'n/no-path-concat': 'error',
    'n/no-process-env': 'error',
    // 'n/no-process-exit': 'error', // part of n/recommended
    'n/no-restricted-import': 'error',
    'n/no-restricted-require': 'error',
    'n/no-sync': 'error',
    // 'n/no-unpublished-bin': 'error', // part of n/recommended
    'n/no-unpublished-import': [
      'error',
      { allowModules: ['apollo-server-testing', 'rosie', '@faker-js/faker', 'ts-jest'] },
    ], // part of n/recommended
    'n/no-unpublished-require': ['error', { allowModules: ['ts-jest', 'require-json5'] }], // part of n/recommended
    // 'n/no-unsupported-features/es-builtins': 'error', // part of n/recommended
    // 'n/no-unsupported-features/es-syntax': 'error', // part of n/recommended
    // 'n/no-unsupported-features/node-builtins': 'error', // part of n/recommended
    'n/prefer-global/buffer': 'error',
    'n/prefer-global/console': 'error',
    'n/prefer-global/process': 'error',
    'n/prefer-global/text-decoder': 'error',
    'n/prefer-global/text-encoder': 'error',
    'n/prefer-global/url': 'error',
    'n/prefer-global/url-search-params': 'error',
    'n/prefer-node-protocol': 'error',
    'n/prefer-promises/dns': 'error',
    'n/prefer-promises/fs': 'error',
    // 'n/process-exit-as-throw': 'error', // part of n/recommended
    'n/shebang': 'error',

    // promise
    // 'promise/always-return': 'error', // part of promise/recommended
    'promise/avoid-new': 'error',
    // 'promise/catch-or-return': 'error', // part of promise/recommended
    // 'promise/no-callback-in-promise': 'warn', // part of promise/recommended
    'promise/no-multiple-resolved': 'error',
    'promise/no-native': 'off', // ES5 only
    // 'promise/no-nesting': 'warn', // part of promise/recommended
    // 'promise/no-new-statics': 'error', // part of promise/recommended
    // 'promise/no-promise-in-callback': 'warn', // part of promise/recommended
    // 'promise/no-return-in-finally': 'warn', // part of promise/recommended
    // 'promise/no-return-wrap': 'error', // part of promise/recommended
    // 'promise/param-names': 'error', // part of promise/recommended
    'promise/prefer-await-to-callbacks': 'error',
    'promise/prefer-catch': 'error',
    'promise/spec-only': 'error',
    // 'promise/valid-params': 'error', // part of promise/recommended

    // eslint comments
    '@eslint-community/eslint-comments/disable-enable-pair': ['error', { allowWholeFile: true }],
    '@eslint-community/eslint-comments/no-restricted-disable': 'error',
    '@eslint-community/eslint-comments/no-use': 'off',
    '@eslint-community/eslint-comments/require-description': 'off',
  },
  overrides: [
    // only for ts files
    {
      files: ['*.ts', '*.tsx'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:@typescript-eslint/strict',
        'prettier',
      ],
      rules: {
        // allow explicitly defined dangling promises
        // '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
        'no-void': ['error', { allowAsStatement: true }],
        // ignore prefer-regexp-exec rule to allow string.match(regex)
        '@typescript-eslint/prefer-regexp-exec': 'off',
        // this should not run on ts files: https://github.com/import-js/eslint-plugin-import/issues/2215#issuecomment-911245486
        'import/unambiguous': 'off',
        // this is not compatible with typeorm, due to joined tables can be null, but are not defined as nullable
        '@typescript-eslint/no-unnecessary-condition': 'off',
        // respect underscore as acceptable unused variable
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
      },
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json'],
        // this is to properly reference the referenced project database without requirement of compiling it
        EXPERIMENTAL_useSourceOfProjectReferenceRedirect: true,
      },
    },
    {
      files: ['*.spec.ts'],
      plugins: ['jest'],
      env: {
        jest: true,
      },
      rules: {
        'jest/no-disabled-tests': 'error',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        'jest/prefer-to-have-length': 'error',
        'jest/valid-expect': 'error',
        '@typescript-eslint/unbound-method': 'off',
        'jest/unbound-method': 'error',
      },
    },
    {
      extends: ['plugin:jsonc/recommended-with-jsonc'],
      files: ['*.json', '*.json5', '*.jsonc'],
      parser: 'jsonc-eslint-parser',
    },
  ],
}
