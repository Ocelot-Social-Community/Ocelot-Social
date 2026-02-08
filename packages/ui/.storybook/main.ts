import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  viteFinal(viteConfig) {
    // Remove plugins that are only needed for library build
    viteConfig.plugins = viteConfig.plugins?.filter((plugin) => {
      const name = plugin && 'name' in plugin ? plugin.name : ''
      return name !== 'vite:dts' && name !== 'build-css'
    })

    // Remove library build config
    if (viteConfig.build) {
      delete viteConfig.build.lib
      delete viteConfig.build.rollupOptions
    }

    return viteConfig
  },
}

export default config
