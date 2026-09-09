# End-to-End Testing

## Setup with docker

Are you running everything through docker? You're so lucky you don't have to
setup anything!

Just:

```bash
$ docker-compose up
```

## Setup without docker

To start the services that are required for cypress testing manually. You basically need the whole setup to run:

- backend
- webapp
- neo4j

Navigate to the corresponding folders and start the services.

## Install cypress

Even if the required services for testing run via docker, depending on your
setup, the cypress tests themselves run on your host machine. So with our
without docker, you would have to install cypress and its dependencies first:

```bash
# in the root folder /
$ npm ci
```

## Pick a browser

Both `cypress:run` and `cypress:open` default to **Chrome**, which is what the CI runner has.
Cypress does not download it — it has to be installed on the machine the tests run on. To use a
different one, set `CYPRESS_BROWSER` to any browser Cypress detects:

```bash
$ npx cypress info                                  # lists what Cypress found
$ CYPRESS_BROWSER=chromium npm run cypress:run      # e.g. Chromium instead of Chrome
```

Electron — the browser Cypress bundles, and the suite's previous default — is **not** a working
choice any more, even though it needs no installation. Cypress 16 ships Electron 146, whose
headless mode has no WebGL; mapbox-gl then throws while mounting and takes the surrounding render
down with it, so every page embedding a map (the whole contribution form, for one) is replaced by
Nuxt's error page. Cypress deprecated Electron as a test browser in the same release.

### Open Interactive Test Console

The interactive cypress test console allows to run tests and have visual feedback on that. The interactive cypress environment also helps at debugging the tests, you can even time travel between individual steps and see the exact state of the app.

To use this feature run:

```bash
$ npm run cypress:open
```

![Interactive Cypress Environment](../docu/gitbook/grafik-1%20%281%29.png)

## Run cypress

To run cypress without the user interface:

```bash
$ npm run cypress:run
```

This is used to run cypress in CI or in console

![Console output after running cypress test](../docu/gitbook/grafik%20%281%29.png)

## Write some Tests

Check out the Cypress documentation for further information on how to write tests:
[Write-a-simple-test](https://docs.cypress.io/guides/getting-started/writing-your-first-test.html#Write-a-simple-test)
