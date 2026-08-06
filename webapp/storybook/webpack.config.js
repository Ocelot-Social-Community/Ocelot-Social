const path = require('path')
const srcDir = '..'
const rootDir = '..'

// Export a function. Accept the base config as the only param.
module.exports = async ({ config, mode }) => {
  // `mode` has a value of 'DEVELOPMENT' or 'PRODUCTION'
  // You can change the configuration based on that.
  // 'PRODUCTION' is used when building the static version of storybook.

  // No .scss files remain, so the former sass-loader rule is gone with them — the stylesheets are
  // plain CSS and go through Storybook's own CSS pipeline.

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
