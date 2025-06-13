import { getDriver } from '@db/neo4j'

import type { DeleteImageOpts, MergeImageOpts } from './images'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncFunc = (...args: any[]) => Promise<any>
export const wrapTransaction = async <F extends AsyncFunc>(
  wrappedCallback: F,
  args: unknown[],
  opts: DeleteImageOpts | MergeImageOpts,
) => {
  const session = getDriver().session()
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await session.writeTransaction((transaction) => {
      return wrappedCallback(...args, { ...opts, transaction })
    })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return result
  } finally {
    await session.close()
  }
}
