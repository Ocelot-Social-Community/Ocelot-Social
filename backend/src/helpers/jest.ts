// sometime we have to wait to check a db state by having a look into the db in a certain moment
// or we wait a bit to check if we missed to set an await somewhere
// see: https://www.sitepoint.com/delay-sleep-pause-wait/
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
// usage – 4 seconds for example
// await sleep(4 * 1000)
