# boilerplate-frontend
[![nodejs][badge-nodejs-img]][badge-nodejs-href]
[![npm][badge-npm-img]][badge-npm-href]
[![vue][badge-vue-img]][badge-vue-href]
[![vike][badge-vike-img]][badge-vike-href]
[![vuetify][badge-vuetify-img]][badge-vuetify-href]
[![storybook][badge-storybook-img]][badge-storybook-href]
[![pinia][badge-pinia-img]][badge-pinia-href]

The IT4C Boilerplate for frontends

## Requirements

To be able to build this project you need:
- nodejs
- npm

## Commands

The following commands are available:

<!--
| Command                   | Description                              |
|---------------------------|------------------------------------------|
| `npm install`             | Project setup                            |
| `npm run build`           | Compiles and minifies for production     |
| **Develop**               |                                          |
| `npm run dev`             | Compiles and hot-reloads for development |
| `npm run preview`         | Run production preview                   |
| **Test**                  |                                          |
| `npm run lint`            | Runs all linters                         |
| `npm test`                | Run all tests & linters                  |
| **Storybook**             |                                          |
| `npm run storybook`       | Run Storybook                            |
| `npm run build:storybook` | Build static storybook                   |
-->
| Command                   | Description                              |
|---------------------------|------------------------------------------|
| `npm install`             | Project setup                            |
| `npm run build`           | Compiles and minifies for production     |
| `npm run server:prod`     | Runs productions server                  |
| **Develop**               |                                          |
| `npm run dev`             | Compiles and hot-reloads for development |
| `npm run server:dev`      | Run development server                   |
| **Test**                  |                                          |
| `npm test`                | Run all tests & linters                  |
| **Storybook**             |                                          |
| `npm run storybook`       | Run Storybook                            |
| `npm run build:storybook` | Build static storybook                   |

## Technology

- [x] vite
- [x] vike
- [x] vue3
- [x] vuetify
- [x] storybook
- [x] pinia store
- [ ] eslint
- [ ] figma
- [ ] chromatic
- [ ] jest
- [ ] localization?
- [ ] documentation?
- [ ] docker

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

[badge-storybook-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=devDependencies.storybook&label=storybook&color=yellow
[badge-storybook-href]: https://storybook.js.org/