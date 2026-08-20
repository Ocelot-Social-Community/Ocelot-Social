// Race a promise against a setTimeout-driven rejection. Used by both the
// resolver-level LiveKit API calls and the background poller so a flaky
// LiveKit instance can't stall the request indefinitely.

// Pure pass-through over Promise.race — adding async/await here would only
// wrap the returned promise again without changing semantics.
// eslint-disable-next-line @typescript-eslint/promise-function-async
export const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  // eslint-disable-next-line promise/avoid-new
  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms.toString()}ms`))
    }, ms)
    if (typeof timer.unref === 'function') {
      timer.unref()
    }
  })
  // Clear the timer once the race settles so a fast resolution doesn't leave
  // a pending setTimeout behind — otherwise burst traffic piles them up until
  // the underlying timers fire.
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) {
      clearTimeout(timer)
    }
  })
}
