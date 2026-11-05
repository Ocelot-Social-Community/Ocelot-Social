// Vitest global setup: the suite geocodes against the Mapbox stub, never against Mapbox itself.
// Several specs create users, groups and events with a location, and each of those used to be a
// real, billed request (every CI run, every shard). Started once for the whole run, on a free
// port; the address reaches the workers through MAPBOX_API_URL, which TEST_CONFIG reads — set
// here, before the workers are forked, so they inherit it.
import { startMapboxStub } from './mapbox-stub/server'

import type { MapboxStub } from './mapbox-stub/server'

let stub: MapboxStub | undefined

export const setup = async () => {
  stub = await startMapboxStub()
  // eslint-disable-next-line n/no-process-env -- handed to the forked workers, see above
  process.env.MAPBOX_API_URL = stub.url
}

export const teardown = async () => {
  await stub?.close()
}
