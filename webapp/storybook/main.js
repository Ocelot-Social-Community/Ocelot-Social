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
    // patched here rather than only covering the scss handling below.
    //
    // TRANSITIONAL, and it has to stay exactly as long as nuxt.config.js keeps its `styleResources`:
    // the components rendered in stories still carry `<style lang="scss">` and resolve `$token`
    // references through this prelude. Dropping the rule while they exist does not degrade the styling,
    // it fails the Storybook build outright. Removed together with sass, once the last such block is
    // gone — the plain-CSS stylesheets already go through Storybook's own CSS pipeline.
    //
    // Extending the builder's own `.css$` rule in place — rather than pushing a parallel `.scss$` rule
    // — is deliberate: vue-loader clones whichever rule it finds via its own resolution for a given
    // `lang`, and a separately-pushed rule silently never got picked for non-scoped `<style lang="scss">`
    // blocks (scoped ones worked). Reusing the rule vue-loader already resolves correctly sidesteps that.
    const defaultCssRule = config.module.rules.find((r) => String(r.test) === String(/\.css$/))
    if (defaultCssRule) {
      defaultCssRule.test = /\.(css|scss)$/
      defaultCssRule.include = path.resolve(__dirname, '../')
      const cssLoaderUse = defaultCssRule.use.find(
        (u) => u.loader && u.loader.includes('css-loader'),
      )
      if (cssLoaderUse) {
        cssLoaderUse.options = { ...cssLoaderUse.options, url: passThroughAbsoluteUrls }
      }
      defaultCssRule.use.push(
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
      )
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
