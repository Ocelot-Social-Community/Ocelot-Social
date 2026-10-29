import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  // The autodocs page every story file asks for with `tags: ['autodocs']`: since Storybook 9
  // docs are an addon, and without it the tag does nothing.
  addons: ['@storybook/addon-docs'],
  core: {
    disableTelemetry: true,
  },
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
