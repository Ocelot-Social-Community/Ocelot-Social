import { config } from '@vue/test-utils'

config.global.config.warnHandler = (msg) => {
  throw new Error(`[Vue warn]: ${msg}`)
}

config.global.config.errorHandler = (err) => {
  throw err instanceof Error ? err : new Error(`[Vue error]: ${String(err)}`)
}
