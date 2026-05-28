// Race a promise against a setTimeout-driven rejection. Used by both the
// resolver-level LiveKit API calls and the background poller so a flaky
// LiveKit instance can't stall the request indefinitely.

// Pure pass-through over Promise.race — adding async/await here would only
// wrap the returned promise again without changing semantics.
// eslint-disable-next-line @typescript-eslint/promise-function-async
export const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    // eslint-disable-next-line promise/avoid-new
    new Promise<T>((_resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${label} timed out after ${ms.toString()}ms`))
      }, ms)
      if (typeof timer.unref === 'function') timer.unref()
    }),
  ])
