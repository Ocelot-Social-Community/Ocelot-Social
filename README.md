# Ocelot.Social

[![Backend](https://github.com/Ocelot-Social-Community/Ocelot-Social/actions/workflows/test-backend.yml/badge.svg?branch=master)](https://github.com/Ocelot-Social-Community/Ocelot-Social/actions/workflows/test-backend.yml?query=branch%3Amaster)
[![Webapp](https://github.com/Ocelot-Social-Community/Ocelot-Social/actions/workflows/test-webapp.yml/badge.svg?branch=master)](https://github.com/Ocelot-Social-Community/Ocelot-Social/actions/workflows/test-webapp.yml?query=branch%3Amaster)
[![End-to-end](https://github.com/Ocelot-Social-Community/Ocelot-Social/actions/workflows/test-e2e.yml/badge.svg?branch=master)](https://github.com/Ocelot-Social-Community/Ocelot-Social/actions/workflows/test-e2e.yml?query=branch%3Amaster)
[![UI library](https://github.com/Ocelot-Social-Community/Ocelot-Social/actions/workflows/ui-test.yml/badge.svg?branch=master)](https://github.com/Ocelot-Social-Community/Ocelot-Social/actions/workflows/ui-test.yml?query=branch%3Amaster)
[![Publish](https://github.com/Ocelot-Social-Community/Ocelot-Social/actions/workflows/publish.yml/badge.svg?branch=master)](https://github.com/Ocelot-Social-Community/Ocelot-Social/actions/workflows/publish.yml?query=branch%3Amaster)

[![Release](https://img.shields.io/github/v/release/Ocelot-Social-Community/Ocelot-Social?label=release)](https://github.com/Ocelot-Social-Community/Ocelot-Social/releases/latest)
[![@ocelot-social/ui](https://img.shields.io/npm/v/@ocelot-social/ui?label=%40ocelot-social%2Fui)](https://www.npmjs.com/package/@ocelot-social/ui)
[![@ocelot-social/branding](https://img.shields.io/npm/v/@ocelot-social/branding?label=%40ocelot-social%2Fbranding)](https://www.npmjs.com/package/@ocelot-social/branding)
[![Documentation](https://img.shields.io/badge/docs-docs.ocelot.social-blue)](https://docs.ocelot.social)
[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/LICENSE.md)
[![Discord](https://img.shields.io/discord/489522408076738561.svg?label=discord)](https://discord.gg/AJSX9DCSUA)

[Ocelot.social](https://ocelot.social) is free and open source software to run your own social network — for a community, an association, a movement or a region. It is developed by a community of programmers and the operators of the networks running on it.

<!-- markdownlint-disable MD033 -->
<!-- `align`, not CSS: GitHub strips `style` attributes from rendered markdown. -->
<p align="center">
  <a href="https://ocelot.social" target="_blank"><img src="https://raw.githubusercontent.com/Ocelot-Social-Community/Ocelot-Social/master/webapp/static/img/custom/logo-squared.svg" alt="ocelot.social" width="40%" height="40%"></a>
</p>
<!-- markdownlint-enable MD033 -->

Our goal is that people can take part fairly and equally in online social networks — with every voice able to be heard. Instead of one platform for everybody, operators run networks of their own, and people choose where they want to be. The data stays close to the people and to the operator they trust.

In the long run we want these networks to connect (ActivityPub, Fediverse), so that people can follow and befriend each other across networks. If you would like to help build that, [get in touch](#contact).

## Screenshots

The pictures are taken from our demo data by the CI on every change to `master`, so they show the network as it is today.

<!-- markdownlint-disable MD033 -->
<table>
  <tr>
    <td><img src="https://raw.githubusercontent.com/Ocelot-Social-Community/Ocelot-Social/readme-screenshots/feed.png" alt="News feed" title="News feed" /></td>
    <td><img src="https://raw.githubusercontent.com/Ocelot-Social-Community/Ocelot-Social/readme-screenshots/post.png" alt="A post with its comments" title="A post with its comments" /></td>
  </tr>
  <tr>
    <td><img src="https://raw.githubusercontent.com/Ocelot-Social-Community/Ocelot-Social/readme-screenshots/groups.png" alt="Groups" title="Groups" /></td>
    <td><img src="https://raw.githubusercontent.com/Ocelot-Social-Community/Ocelot-Social/readme-screenshots/group.png" alt="A group" title="A group" /></td>
  </tr>
  <tr>
    <td><img src="https://raw.githubusercontent.com/Ocelot-Social-Community/Ocelot-Social/readme-screenshots/map.png" alt="Map" title="Map" /></td>
    <td><img src="https://raw.githubusercontent.com/Ocelot-Social-Community/Ocelot-Social/readme-screenshots/chat.png" alt="Chat" title="Chat" /></td>
  </tr>
  <tr>
    <td colspan="2"><img src="https://raw.githubusercontent.com/Ocelot-Social-Community/Ocelot-Social/readme-screenshots/group-rights.png" alt="Rights a network gives its groups" title="Rights a network gives its groups" /></td>
  </tr>
</table>
<!-- markdownlint-enable MD033 -->

## Features

### Content

- news feed, filtered by topic, post type, the people you follow or your groups, and sorted by date or event start
- posts as **articles** and **events** (date, place, online or on site), with images and embeds
- comments, reactions, shouts and pinned posts
- hashtags, @-mentions and full-text search
- a **map** of people, groups and events

### Community

- user profiles with location, social media links and badges
- following, muting and blocking
- **groups** — public, closed or hidden — with their own roles and rights: who may read, post, comment, invite, join or manage members is set per role, from a template or right by right
- invite links for the network and for groups

### Communication

- **chat**: direct messages, group chats and file messages
- **video calls** in groups (LiveKit)
- notifications in the app and by e-mail, the e-mails configurable per kind

### Running a Network

- **roles and permissions**: define who may do what in the network, beyond the built-in user, moderator, admin and owner
- **network policies**: switch features on or off — registration, invitations, groups, video calls and more
- moderation: reports, review decisions, disabling content and users
- administration of users, groups, categories, hashtags, pages, donations and API keys
- **branding**: name, logo, colours and texts of your own network
- 11 languages, installable as an app (PWA)

## User Guide and FAQ

- [User Guide](https://github.com/Ocelot-Social-Community/Ocelot-Social/wiki/en:User-Guide)
- [Frequently Asked Questions](https://github.com/Ocelot-Social-Community/Ocelot-Social/wiki/en:FAQ)

## Demo

Try it on our staging network [stage.ocelot.social](https://stage.ocelot.social). These logins work there and on a local installation with the demo data:

| email | password | role |
| :--- | :--- | :--- |
| `user@example.org` | 1234 | user |
| `moderator@example.org` | 1234 | moderator |
| `admin@example.org` | 1234 | admin |
| `owner@example.org` | 1234 | owner |

## Help Us

- Spread the word: link [ocelot.social](https://ocelot.social) on your website, like it on [AlternativeTo](https://alternativeto.net/software/ocelot-social/), star this repository, tell your friends, or write about it.
- Take a [good first issue](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) — read [CONTRIBUTING.md](./CONTRIBUTING.md) first.
- Test and [report bugs](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/new/choose), review pull requests.
- Translate: please [contact us](#contact).

## Donate

Ocelot.social is mostly developed and maintained by the association [busFaktor() e.V.](https://www.busfaktor.org/en). Please support it with a [donation](https://www.busfaktor.org/en/donations). Thanks a lot! ❤️

## Contact

Would you like to run a network of your own, or join one?

- [hello@ocelot.social](mailto:hello@ocelot.social)
- our developer chat on [Discord](https://discord.gg/AJSX9DCSUA)

## For Developers

New here? Have a look at our short [developer welcome video](https://www.youtube.com/watch?v=gZSL6KvBIiY&list=PLFMD5liPP01kbuReHxYXxv_1fI5rIgS1f&index=1).

### Quick Start

With Docker (24.0.6 or newer):

```bash
$ git clone https://github.com/Ocelot-Social-Community/Ocelot-Social.git
$ cd Ocelot-Social
$ cp webapp/.env.template webapp/.env
$ cp backend/.env.template backend/.env
$ docker compose up

# in a second terminal, once everything is up
$ docker compose exec backend npm run db:migrate -- init
$ docker compose exec backend npm run db:migrate -- up
$ docker compose exec backend npm run db:seed
```

Then open <http://localhost:3000> and log in with one of the [demo accounts](#demo). The full guide — production compose, local installation without Docker, Apple Silicon and the one-time MinIO volume migration — is in [installation.md](./installation.md).

### Repository Layout

| Folder | What it is |
| :--- | :--- |
| [backend](./backend) | GraphQL API server (Node.js, TypeScript, Apollo) on a Neo4j graph database |
| [webapp](./webapp) | the web frontend (Vue 2, Nuxt 2), server- and client-side rendered |
| [packages/ui](./packages/ui) | the component library, Vue 2 and 3 compatible, with Storybook |
| [packages/branding](./packages/branding) | what a network can brand, and the defaults |
| [cypress](./cypress) | end-to-end tests and executable feature specifications |
| [deployment](./deployment) | Helm charts and configuration for running a network |
| [maintenance](./maintenance) | the page shown while a network is under maintenance |

### Technology Stack

- [Vue.js](https://vuejs.org/) and [Nuxt](https://nuxt.com/), [Tailwind CSS](https://tailwindcss.com/) in the component library
- [GraphQL](https://graphql.org/) with [Apollo](https://www.apollographql.com/), [Node.js](https://nodejs.org/) and [TypeScript](https://www.typescriptlang.org/)
- [Neo4j](https://neo4j.com/), [MinIO](https://min.io/) / S3 for uploads, [LiveKit](https://livekit.io/) for video calls
- [Docker](https://www.docker.com/), [Kubernetes](https://kubernetes.io/) and [Helm](https://helm.sh/)
- Testing: [Vitest](https://vitest.dev/) (backend), [Jest](https://jestjs.io/) with [Vue Test Utils](https://test-utils.vuejs.org/) (webapp), [Cypress](https://www.cypress.io/) (end-to-end), [Playwright](https://playwright.dev/) and [Storybook](https://storybook.js.org/) (visual and accessibility tests of the components), [ESLint](https://eslint.org/)

### Contributing

Choose an issue — our [good first issues](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) are a good start — and leave a comment there. We will then invite you to our volunteers team, which gives you the permission to push to this repository; if we have not invited you yet, ask for it on [Discord](https://discord.gg/AJSX9DCSUA).

Please work on a branch of this repository rather than a fork: the CI needs credentials a fork does not get. Name the branch `<issue-number>-<description>` and open a pull request against `master`.

Before you push, run the linters, and the tests of what you changed:

```bash
# in folder webapp/
$ npm run lint -- --fix
$ npm run locales -- --fix
$ npm test

# in folder backend/ — the tests wipe the database they run against,
# so never point them at data you want to keep
$ npm run lint -- --fix
$ npm test
```

More in our [contribution guideline](./CONTRIBUTING.md). On [Discord](https://discord.gg/AJSX9DCSUA), introduce yourself at `#introduce-yourself` and mention `@@Mentors` to get onboard 🤓

### Deployment

Networks run on [Kubernetes](https://kubernetes.io/), deployed with the Helm charts in [deployment](./deployment/README.md). A network's look and texts live in its own branding repository; [stage.ocelot.social](https://github.com/Ocelot-Social-Community/stage.ocelot.social) is the template.

### Attributions

Locale icons made by [Freepik](http://www.freepik.com/) from [www.flaticon.com](https://www.flaticon.com/), licensed under [CC 3.0 BY](http://creativecommons.org/licenses/by/3.0/).

Browser compatibility testing with [BrowserStack](https://www.browserstack.com/).

<!-- markdownlint-disable MD033 -->
<img alt="BrowserStack Logo" src="https://raw.githubusercontent.com/Ocelot-Social-Community/Ocelot-Social/master/docu/gitbook/browserstack-logo.svg" width="256">
<!-- markdownlint-enable MD033 -->

### License

See the [LICENSE](LICENSE.md) file for license rights and limitations (MIT).
