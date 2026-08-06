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
  staticDirs: ['../static'],
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
    }

    return config
  },
}
