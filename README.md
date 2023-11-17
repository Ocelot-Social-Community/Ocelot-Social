# boilerplate-frontend
[![nodejs][badge-nodejs-img]][badge-nodejs-href]
[![npm][badge-npm-img]][badge-npm-href]
[![docker][badge-docker-img]][badge-docker-href]
[![vue][badge-vue-img]][badge-vue-href]
[![vike][badge-vike-img]][badge-vike-href]
[![vuetify][badge-vuetify-img]][badge-vuetify-href]
[![pinia][badge-pinia-img]][badge-pinia-href]
[![vue-i18n][badge-vue-i18n-img]][badge-vue-i18n-href]
[![eslint][badge-eslint-img]][badge-eslint-href]
[![remark-cli][badge-remark-cli-img]][badge-remark-cli-href]
[![vitest][badge-vitest-img]][badge-vitest-href]
[![storybook][badge-storybook-img]][badge-storybook-href]
[![vuepress][badge-vuepress-img]][badge-vuepress-href]

The IT4C Boilerplate for frontends

## Requirements & Technology

To be able to build this project you need `nodejs`, `npm` and optional `docker`.

The project uses `vite` as builder, `vike` to do the SSR. The design framework is `vuetify` which requires the frontend framework `vue3`. For localization `vue-i18n` is used; Session storage is handled with `pinia`.

Testing is done with `vitest` and code style is enforced with `eslint` and `remark-cli`.

This projects utilizes `storybook` to develop frontend components and `vuepress` for static documentation generation.

## Commands

The following commands are available:

| Command                      | Description                                     |
|------------------------------|-------------------------------------------------|
| `npm install`                | Project setup                                   |
| `npm run build`              | Compiles and minifies for production            |
| `npm run server:prod`        | Runs productions server                         |
| **Develop**                  |                                                 |
| `npm run dev`                | Compiles and hot-reloads for development        |
| `npm run server:dev`         | Run development server                          |
| **Test**                     |                                                 |
| `npm run test:lint`          | Run all linters                                 |
| `npm run test:lint:eslint`   | Run linter eslint                               |
| `npm run test:lint:remark`   | Run linter remark                               |
| `npm run test:unit`          | Run all unit tests in watch mode                |
| `npm run test:unit:coverage` | Run all unit tests and generate coverage report |
| `npm test`                   | Run all tests & linters                         |
| **Storybook**                |                                                 |
| `npm run storybook`          | Run Storybook                                   |
| `npm run storybook:build`    | Build static storybook                          |
| `npm run storybook:test`     | Runs tests against all storybook stories        |
| **Documentation**            |                                                 |
| `npm run docs:dev`           | Run Documentation in development mode           |
| `npm run docs:build`         | Build static documentation                      |

### Docker

Docker can be run in development mode utilizing `docker-compose.overwrite.yml`:
```bash
docker compose up
```

Docker can be run in production mode:
```bash
docker compose -f docker-compose.yml up
```

## Endpoints

The following endpoints are provided given the right command is executed or all three if `docker compose` is used:

| Endpoint                                       | Description   |
|------------------------------------------------|---------------|
| [http://localhost:3000](http://localhost:3000) | Web           |
| [http://localhost:6006](http://localhost:6006) | Storybook     |
| [http://localhost:8080](http://localhost:8080) | Documentation |

## TODO

- [x] vite
- [x] vike
- [x] vue3
- [x] vuetify
- [x] pinia store
- [x] storybook
- [x] eslint
- [x] vitest
- [x] vue-i18n
- [x] docker
- [x] vuepress
- [ ] figma
- [ ] chromatic
- [ ] github actions

## Known Problems

Currently none

## License

[Apache 2.0](./LICENSE)

<!-- Badges -->
[badge-nodejs-img]: https://img.shields.io/badge/nodejs-%3E%3D20.5.0-blue
[badge-nodejs-href]:  https://nodejs.org/

[badge-npm-img]: https://img.shields.io/badge/npm-latest-blue
[badge-npm-href]: https://www.npmjs.com/package/npm

[badge-docker-img]: https://img.shields.io/badge/docker-latest-blue
[badge-docker-href]: https://www.docker.com/

[badge-vue-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=dependencies.vue&label=vue&color=green
[badge-vue-href]: https://vuejs.org/

[badge-vike-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=dependencies.vike&label=vike&color=green
[badge-vike-href]: https://vike.dev/

[badge-vuetify-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=dependencies.vuetify&label=vuetify&color=green
[badge-vuetify-href]: https://vuetifyjs.com/

[badge-pinia-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=dependencies.pinia&label=pinia&color=green
[badge-pinia-href]: https://pinia.vuejs.org/

[badge-vue-i18n-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=dependencies%5B%27vue-i18n%27%5D&label=vue-i18n&color=green
[badge-vue-i18n-href]: https://vue-i18n.intlify.dev/

[badge-eslint-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=devDependencies.eslint&label=eslint&color=yellow
[badge-eslint-href]: https://eslint.org/

[badge-remark-cli-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=devDependencies%5B%27remark-cli%27%5D&label=remark-cli&color=yellow
[badge-remark-cli-href]: https://remark.js.org/

[badge-vitest-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=devDependencies.vitest&label=vitest&color=yellow
[badge-vitest-href]: https://vitest.dev/

[badge-storybook-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=devDependencies.storybook&label=storybook&color=orange
[badge-storybook-href]: https://storybook.js.org/

[badge-vuepress-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=devDependencies.vuepress&label=vuepress&color=orange
[badge-vuepress-href]: https://vuepress.vuejs.org/
