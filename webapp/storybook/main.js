const path = require('path')

module.exports = {
  stories: ['../components/**/*.story.js'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-actions', 'storybook-design-token'],
  framework: {
    name: '@storybook/vue-webpack5',
    options: {},
  },
  // All 21 stories still use the legacy `storiesOf` API (chained `.addDecorator`/`.add` calls).
  // SB7's default storyStoreV7 indexer refuses to index anything written that way — this documented
  // opt-out restores the classic store so those stories keep showing up without a CSF3 rewrite.
  features: {
    storyStoreV7: false,
  },
  // `fixtures/` holds the images the stories render (see helpers.postImage/avatarImage). It is
  // mounted under its own prefix rather than merged into `static/` so these test-only assets never
  // ship in the production bundle, and so they can't collide with a real app asset name.
  staticDirs: ['../static', { from: './fixtures', to: '/storybook-fixtures' }],
  webpackFinal: async (config) => {
    // Root-relative url()s (`/fonts/...`, `/img/...`) point at the `static/` dir, which staticDirs
    // serves at `/` — they are not webpack modules. css-loader's default `url` resolution tries to
    // require() them anyway and fails the build; this filter leaves absolute urls untouched.
    const passThroughAbsoluteUrls = { filter: (url) => !url.startsWith('/') }

    // The builder's own default `.css$` rule (added before webpackFinal runs) has the same problem —
    // and vue-loader clones it for `<style lang="css">` blocks in every component, so it has to be
    // patched here. No .scss files remain in the project (dropped along with sass project-wide), so
    // this rule only ever needs to handle plain CSS.
    const defaultCssRule = config.module.rules.find((r) => String(r.test) === String(/\.css$/))
    if (defaultCssRule) {
      const cssLoaderUse = defaultCssRule.use.find(
        (u) => u.loader && u.loader.includes('css-loader'),
      )
      if (cssLoaderUse) {
        cssLoaderUse.options = { ...cssLoaderUse.options, url: passThroughAbsoluteUrls }
      }
    }

    // load svgs with vue-svg-loader instead of the builder's default asset/resource rule
    const imageRule = config.module.rules.find((r) => r.test && r.test.toString().includes('svg'))
    if (imageRule) {
      imageRule.test =
        /\.(ico|jpg|jpeg|png|apng|gif|eot|otf|webp|ttf|woff|woff2|cur|ani|pdf)(\?.*)?$/
    }

    config.module.rules.push({
      test: /\.svg$/,
      use: [
        'babel-loader',
        {
          loader: 'vue-svg-loader',
          options: {
            svgo: {
              plugins: [
                {
                  removeViewBox: false,
                },
                {
                  removeDimensions: true,
                },
              ],
            },
          },
        },
      ],
    })

    config.resolve.alias = {
      ...config.resolve.alias,
      '~~': path.resolve(__dirname, '../'),
      '~': path.resolve(__dirname, '../'),
      // The full build compiles the inline `template:` strings every story here still uses — the
      // plain package resolves to the runtime-only build, which can't and errors on them.
      vue$: require.resolve('vue/dist/vue.esm.js'),
      // @ocelot-social/ui ships its own nested node_modules/vue — Vue 3, not this project's Vue 2.7.
      // Its bundled vue-demi (same version, but resolved from that nested node_modules) detects that
      // copy and renders everything Vue-3-shaped: every <os-icon> came out as a blank <svg><path/></svg>
      // instead of an error, since vue-demi degrades silently rather than throwing on the mismatch.
      // nuxt.config.js hits the identical problem and fixes it the same way — see the comment there.
      'vue-demi': require.resolve('vue-demi'),
    }

    return config
  },
}
