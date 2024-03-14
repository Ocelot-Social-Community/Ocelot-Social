import { createTestingPinia } from '@pinia/testing'
import { config } from '@vue/test-utils'

config.global.plugins.push(createTestingPinia())
