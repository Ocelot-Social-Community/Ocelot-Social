# boilerplate-frontend
[![nodejs][badge-nodejs-img]][badge-nodejs-href]
[![npm][badge-npm-img]][badge-npm-href]

The IT4C Boilerplate for frontends

## Requirements

To be able to build this project you need:
- nodejs
- npm

## Commands

The following commands are available:

| Command                 | Description                              |
|-------------------------|------------------------------------------|
| `npm install`           | Project setup                            |
| `npm run build`         | Compiles and minifies for production     |
| **Develop**             |                                          |
| `npm run dev`           | Compiles and hot-reloads for development |
| `npm run preview`       | Run production preview                   |
| **Test**                |                                          |
| `npm run lint`          | Runs all linters                         |
| `npm test`              | Run all tests & linters                  |
| **Storybook**           |                                          |
| `npm run storybook`     | Run Storybook                            |
| npm run build:storybook | Build static storybook                   |

## Technologie

- [X] ~~nuxt3~~
- [x] vuetify
- [x] vue3
- [x] pinia store
- [x] storybook
- [-] eslint
- [ ] vite vue3 ssr
- [ ] figma
- [ ] chromatic
- [ ] jest
- [ ] localization?
- [ ] documentation?

## Known Problems

Storybook delivers Introduction producing errors: https://github.com/storybookjs/storybook/issues/24792

## Links

See [Configuration Reference](https://vitejs.dev/config/).

## License

[Apache 2.0](./LICENSE)

<!-- Badges -->
[badge-nodejs-img]: https://img.shields.io/badge/nodejs-%3E%3D20.5.0-blue
[badge-nodejs-href]:  https://nodejs.org/

[badge-npm-img]: https://img.shields.io/badge/npm-latest-blue
[badge-npm-href]: https://www.npmjs.com/package/npm