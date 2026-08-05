const path = require('path')
const srcDir = '..'
const rootDir = '..'

// Export a function. Accept the base config as the only param.
module.exports = async ({ config, mode }) => {
  // `mode` has a value of 'DEVELOPMENT' or 'PRODUCTION'
  // You can change the configuration based on that.
  // 'PRODUCTION' is used when building the static version of storybook.

  // TRANSITIONAL, and it has to stay exactly as long as nuxt.config.js keeps its `styleResources`:
  // the components rendered in stories still carry `<style lang="scss">` and resolve `$token`
  // references through this prelude. Dropping the rule while they exist does not degrade the styling,
  // it fails the Storybook build outright. Removed together with sass, once the last such block is
  // gone — the plain-CSS stylesheets already go through Storybook's own CSS pipeline.
  config.module.rules.push({
    test: /\.scss$/,
    use: [
      { loader: 'style-loader' },
      { loader: 'css-loader', options: { sourceMap: true } },
      { loader: 'sass-loader', options: { sourceMap: true } },
      {
        loader: 'style-resources-loader',
        options: {
          patterns: [
            path.resolve(__dirname, '../assets/_new/styles/_styleguide-tokens.scss'),
            path.resolve(__dirname, '../assets/_new/styles/tokens.scss'),
          ],
          injector: 'prepend',
        },
      },
    ],
    include: path.resolve(__dirname, '../'),
  })

  // load svgs with vue-svg-loader instead of file-loader
  const rule = config.module.rules.find(
    (r) =>
      r.test && r.test.toString().includes('svg') && r.loader && r.loader.includes('file-loader'),
  )
  rule.test = /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|cur|ani)(\?.*)?$/

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
    '~~': path.resolve(__dirname, rootDir),
    '~': path.resolve(__dirname, srcDir),
  }

  // Return the altered config
  return config
}
