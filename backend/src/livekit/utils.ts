// Race a promise against a setTimeout-driven rejection. Used by both the
// resolver-level LiveKit API calls and the background poller so a flaky
// LiveKit instance can't stall the request indefinitely.

// Pure pass-through over Promise.race — adding async/await here would only
// wrap the returned promise again without changing semantics.
// eslint-disable-next-line @typescript-eslint/promise-function-async
export const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  // Definite assignment, not `| undefined`: a Promise executor runs SYNCHRONOUSLY, so the timer
  // exists before this function returns and long before `.finally` below can run. The two guards
  // that used to stand here (`typeof timer.unref === 'function'` and `if (timer)`) could not
  // execute their other side — `unref` is on every Node Timeout, and the executor cannot not have
  // run.
  let timer!: ReturnType<typeof setTimeout>
  // eslint-disable-next-line promise/avoid-new
  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms.toString()}ms`))
    }, ms)
    // So a pending timeout never keeps the process alive on its own.
    timer.unref()
  })
  // Clear the timer once the race settles so a fast resolution doesn't leave
  // a pending setTimeout behind — otherwise burst traffic piles them up until
  // the underlying timers fire.
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer)
  })
}
