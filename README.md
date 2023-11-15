# boilerplate-frontend
[![nodejs][badge-nodejs-img]][badge-nodejs-href]
[![npm][badge-npm-img]][badge-npm-href]
[![vue][badge-vue-img]][badge-vue-href]
[![vike][badge-vike-img]][badge-vike-href]
[![vuetify][badge-vuetify-img]][badge-vuetify-href]
[![pinia][badge-pinia-img]][badge-pinia-href]
[![eslint][badge-eslint-img]][badge-eslint-href]
[![vitest][badge-vitest-img]][badge-vitest-href]
[![storybook][badge-storybook-img]][badge-storybook-href]

The IT4C Boilerplate for frontends

## Requirements

To be able to build this project you need:
- nodejs
- npm

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
| `npm run test:unit`          | Run all unit tests in watch mode                |
| `npm run test:unit:coverage` | Run all unit tests and generate coverage report |
| `npm test`                   | Run all tests & linters                         |
| **Storybook**                |                                                 |
| `npm run storybook`          | Run Storybook                                   |
| `npm run storybook:build`    | Build static storybook                          |

## Technology

- [x] vite
- [x] vike
- [x] vue3
- [x] vuetify
- [x] pinia store
- [x] storybook
- [x] eslint
- [x] vitest
- [ ] figma
- [ ] chromatic
- [ ] localization?
- [ ] documentation?
- [ ] docker
- [ ] github actions

## Known Problems

Currently none

## Links

See [Configuration Reference](https://vitejs.dev/config/).\
See [vite-plugin-ssr-vuetify](https://github.com/brillout/vite-plugin-ssr-vuetify).

## License

[Apache 2.0](./LICENSE)

<!-- Badges -->
[badge-nodejs-img]: https://img.shields.io/badge/nodejs-%3E%3D20.5.0-blue
[badge-nodejs-href]:  https://nodejs.org/

[badge-npm-img]: https://img.shields.io/badge/npm-latest-blue
[badge-npm-href]: https://www.npmjs.com/package/npm

[badge-vue-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=dependencies.vue&label=vue&color=green
[badge-vue-href]: https://vuejs.org/

[badge-vike-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=dependencies.vike&label=vike&color=green
[badge-vike-href]: https://vike.dev/

[badge-vuetify-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=dependencies.vuetify&label=vuetify&color=green
[badge-vuetify-href]: https://vuetifyjs.com/

[badge-pinia-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=dependencies.pinia&label=pinia&color=green
[badge-pinia-href]: https://pinia.vuejs.org/

[badge-eslint-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=devDependencies.eslint&label=eslint&color=yellow
[badge-eslint-href]: https://eslint.org/

[badge-vitest-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=devDependencies.vitest&label=vitest&color=yellow
[badge-vitest-href]: https://vitest.dev/


[badge-storybook-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=devDependencies.storybook&label=storybook&color=yellow
[badge-storybook-href]: https://storybook.js.org/