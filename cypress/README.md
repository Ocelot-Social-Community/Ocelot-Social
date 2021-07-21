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
$ yarn install
```

### Open Interactive Test Console

The interactive cypress test console allows to run tests and have visual feedback on that. The interactive cypress environment also helps at debugging the tests, you can even time travel between individual steps and see the exact state of the app.

To use this feature run:

```bash
$ yarn cypress:open
```

![Interactive Cypress Environment](../.gitbook/assets/grafik-1%20%281%29.png)

## Run cypress

To run cypress without the user interface:

```bash
$ yarn cypress:run
```

This is used to run cypress in CI or in console

![Console output after running cypress test](../.gitbook/assets/grafik%20%281%29.png)

## Write some Tests

Check out the Cypress documentation for further information on how to write tests:
[Write-a-simple-test](https://docs.cypress.io/guides/getting-started/writing-your-first-test.html#Write-a-simple-test)
