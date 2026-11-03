#!/usr/bin/env bash
# Two backends, one Redis, and what happens when it goes away. Run from the repository root, by CI
# and by hand alike, with backend/.env in place and the `test` images built:
#
#   backend/test/multi-instance/run.sh
set -euo pipefail

compose() {
  docker compose -f docker-compose.yml -f docker-compose.test.yml --profile multi-instance "$@"
}
specs() {
  compose exec -T backend npm run test:multi-instance -- "test/multi-instance/$1.spec.ts"
}
on_exit() {
  local status=$?
  if [ "$status" -ne 0 ]; then
    compose ps --all
    compose logs --tail=100 backend backend-2 redis
  fi
}
trap on_exit EXIT

# The deadline around a wait, and the reason to give when it runs out.
await() {
  local name="$1" seconds="$2"; shift 2
  echo "Waiting for ${name} (max ${seconds}s)..."
  if ! timeout "$seconds" bash -c "$*"; then
    echo "::error::${name} was not there within ${seconds}s"
    return 1
  fi
}

# A backend is there once it answers, and the second one is only reachable from the first.
await_backends() {
  local probe='for (const url of ["http://localhost:4000", "http://backend-2:4000"]) {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "{ __typename }" }),
    })
  }'
  await "both backends" 120 "until docker compose -f docker-compose.yml -f docker-compose.test.yml exec -T backend node --input-type=module -e '$probe' 2>/dev/null; do sleep 1; done"
}

# Migrated before the backends start, as in production: they seed against the constraints.
compose up --detach neo4j redis
await "the migrations" 300 "until docker compose -f docker-compose.yml -f docker-compose.test.yml run --rm --no-deps -T backend npm run db:migrate -- init; do sleep 5; done"
compose run --rm --no-deps -T backend npm run db:migrate -- up

compose up --detach backend backend-2
await_backends
specs events

# A live backend survives losing Redis, and still answers.
compose stop redis
specs redisDown

# A backend that starts while Redis is away waits for it, and everything works once it is back.
compose restart backend-2
compose start redis
await_backends
specs events
