// Race a promise against a setTimeout-driven rejection. Used by both the
// resolver-level LiveKit API calls and the background poller so a flaky
// LiveKit instance can't stall the request indefinitely.
// eslint-disable-next-line promise/avoid-new
export const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${label} timed out after ${ms.toString()}ms`))
      }, ms)
      if (typeof timer.unref === 'function') timer.unref()
    }),
  ])
