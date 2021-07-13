# Ocelot.Social Deploy And Rebranding

This repository is an in use template to rebrand, configure, and deploy [ocelot.social](https://github.com/Ocelot-Social-Community/Ocelot-Social) networks.

<!-- [![Build Status](https://travis-ci.com/Human-Connection/Human-Connection.svg?branch=master)](https://travis-ci.com/Human-Connection/Human-Connection) -->
<!-- [![Codecov Coverage](https://img.shields.io/codecov/c/github/Human-Connection/Human-Connection/master.svg?style=flat-square)](https://codecov.io/gh/Human-Connection/Human-Connection/) -->
<!-- [![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/Human-Connection/Nitro-Backend/blob/backend/LICENSE.md) -->
<!-- [![Discord Channel](https://img.shields.io/discord/489522408076738561.svg)](https://discordapp.com/invite/DFSjPaX) -->
<!-- [![Open Source Helpers](https://www.codetriage.com/human-connection/human-connection/badges/users.svg)](https://www.codetriage.com/human-connection/human-connection) -->

<p align="center">
  <img src="branding/static/img/custom/logo-squared.svg" alt="Ocelot-Social" width="40%" height="40%">
</p>

<!--
## Live demo

__Try out our deployed [development environment](https://develop.human-connection.org/).__

Logins:

| email | password | role |
| :--- | :--- | :--- |
| `user@example.org` | 1234 | user |
| `moderator@example.org` | 1234 | moderator |
| `admin@example.org` | 1234 | admin |
-->

## Usage

Fork this repository to configure and rebrand it for your own [ocelot.social](https://github.com/Ocelot-Social-Community/Ocelot-Social) network.

### Package.Json And DockerHub Organisation

Write your own data into the main configuration file:

- [package.json](/package.json)

Since all deployment methods described here depend on [Docker](https://docker.com) and [DockerHub](https://hub.docker.com), you need to create your own organisation on DockerHub and put its name in the [package.json](/package.json) file as your `dockerOrganisation`.

### Configure And Branding

The next step is:

- [Configure And Branding](/branding/README.md)

### Optional: Proof Configuration And Branding Locally

Just in case you have Docker installed and run the following, you can check your branding locally:

```bash
# in main folder
$ docker-compose up
# fill the database with an initial admin
$ docker-compose exec backend yarn run prod:migrate init
```

The database is then initialised with the default administrator:

- E-mail: admin@example.org
- Password: 1234

For login or registration have a look in your browser at `http://localhost:3000/`.  
For the maintenance page have a look in your browser at `http://localhost:5000/`.

### Push Changes To GitHub

Before merging these changes into the "master" branch on your GitHub fork repository, you need to configure the GitHub repository secrets.  This is necessary to [publish](/.github/workflows/publish.yml) the Docker images by pushing them via GitHub actions to repositories belonging to your DockerHub organisation.

First, go to your DockerHub profile under `Account Settings` and click on the `Security` tab. There you create an access token called `<your-organisation>-access-token` and copy the token to a safe place.

Secondly, in your GitHub repository, click on the 'Settings' tab and go to the 'Secrets' tab.  There you create two secrets by clicking on `New repository secret`:

1. Named `DOCKERHUB_TOKEN` with the newly created DockerHub token (only the code, not the token name).
2. Named `DOCKERHUB_USERNAME` with your DockerHub username.

### Optional: Proof DockerHub Images Locally

Just in case you like to check your pushed Docker images in your organisation's DockerHub repositories locally:

- rename the file `docker-compose.ocelotsocial-branded.yml` with your network name
- in the file, rename the ocelot.social DockerHub organisation `ocelotsocialnetwork` to your organisations name

Remove any local Docker images if necessary and do the following:

```bash
# in main folder
$ docker-compose -f docker-compose.<your-organisation>-branded.yml up
# fill the database with an initial admin
$ docker-compose exec backend yarn run prod:migrate init
```

See the login details and browser addresses above.

### Deployment

Afterwards you can [deploy](/deployment/README.md) it on your server:

- [Kubernetes with Helm](/deployment/kubernetes/README.md)

## Developer Chat

Join our friendly open-source community on [Discord](https://discord.gg/AJSX9DCSUA) :heart_eyes_cat:
Just introduce yourself at `#introduce-yourself` and mention `@@Mentor` to get you onboard :neckbeard:
Check out the [contribution guideline](https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/CONTRIBUTING.md), too!

We give write permissions to every developer who asks for it. Just text us on
[Discord](https://discord.gg/AJSX9DCSUA).

## Technology Stack

- [Docker](https://www.docker.com)
- [Kubernetes](https://kubernetes.io)
- [Helm](https://helm.sh)

<!--
## Attributions

Locale Icons made by [Freepik](http://www.freepik.com/) from [www.flaticon.com](https://www.flaticon.com/) is licensed by [CC 3.0 BY](http://creativecommons.org/licenses/by/3.0/).

Browser compatibility testing with [BrowserStack](https://www.browserstack.com/).

<img alt="BrowserStack Logo" src=".gitbook/assets/browserstack-logo.svg" width="256">
-->

## License

See the [LICENSE](/LICENSE.md) file for license rights and limitations (MIT).
