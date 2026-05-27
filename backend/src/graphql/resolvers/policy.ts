import type { Context } from '@src/context'

export default {
  Query: {
    publicPolicy: (_parent: unknown, _args: unknown, { policy }: Context) =>
      policy.getSnapshot('public'),
  },
}
