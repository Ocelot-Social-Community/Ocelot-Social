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
    // patched here rather than only covering the scss rule below.
    const defaultCssRule = config.module.rules.find((r) => String(r.test) === String(/\.css$/))
    if (defaultCssRule) {
      const cssLoaderUse = defaultCssRule.use.find((u) => u.loader && u.loader.includes('css-loader'))
      if (cssLoaderUse) {
        cssLoaderUse.options = { ...cssLoaderUse.options, url: passThroughAbsoluteUrls }
      }
    }

    // TRANSITIONAL, and it has to stay exactly as long as nuxt.config.js keeps its `styleResources`:
    // the components rendered in stories still carry `<style lang="scss">` and resolve `$token`
    // references through this prelude. Dropping the rule while they exist does not degrade the styling,
    // it fails the Storybook build outright. Removed together with sass, once the last such block is
    // gone — the plain-CSS stylesheets already go through Storybook's own CSS pipeline.
    config.module.rules.push({
      test: /\.scss$/,
      use: [
        { loader: 'style-loader' },
        // The project's own css-loader (v4, resolved here instead of the builder's nested v6) takes
        // the `url` filter as a plain function rather than v6's `{ filter }` object.
        {
          loader: 'css-loader',
          options: { sourceMap: true, url: (url) => !url.startsWith('/') },
        },
        { loader: 'sass-loader', options: { sourceMap: true } },
        {
          loader: 'style-resources-loader',
          options: {
            patterns: [
              // FIRST, and not optional: tokens.scss calls `color.adjust(...)`, which needs the
              // `@use 'sass:color'` that only this file carries — and `@use` has to precede every
              // other rule, which is the whole reason it is a separate file. Without it the prelude
              // fails with «There is no module with the namespace "color"». nuxt.config.js has always
              // listed it first; Storybook did not, so its SCSS pipeline was broken on its own terms.
              path.resolve(__dirname, '../assets/_new/styles/uses.scss'),
              path.resolve(__dirname, '../assets/_new/styles/_styleguide-tokens.scss'),
              path.resolve(__dirname, '../assets/_new/styles/tokens.scss'),
            ],
            injector: 'prepend',
          },
        },
      ],
      include: path.resolve(__dirname, '../'),
    })

    // load svgs with vue-svg-loader instead of the builder's default asset/resource rule
    const imageRule = config.module.rules.find((r) => r.test && r.test.toString().includes('svg'))
    if (imageRule) {
      imageRule.test = /\.(ico|jpg|jpeg|png|apng|gif|eot|otf|webp|ttf|woff|woff2|cur|ani|pdf)(\?.*)?$/
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
