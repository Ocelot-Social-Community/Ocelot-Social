import { defineConfig } from 'vitest/config'

import base from './vitest.config'

// Runs against the two backends of the `multi-instance` compose profile, so it is no part of
// `npm test`: without them there is nothing to talk to. Which spec runs is the caller's choice,
// because redisDown.spec.ts needs Redis stopped and the other one needs it running.
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ['test/multi-instance/*.spec.ts'],
    coverage: { enabled: false },
  },
})
