# boilerplate-frontend
[![nodejs][badge-nodejs-img]][badge-nodejs-href]
[![npm][badge-npm-img]][badge-npm-href]
[![docker][badge-docker-img]][badge-docker-href]
[![jq][badge-jq-img]][badge-jq-href]
[![vue][badge-vue-img]][badge-vue-href]
[![vike][badge-vike-img]][badge-vike-href]
[![vuetify][badge-vuetify-img]][badge-vuetify-href]
[![pinia][badge-pinia-img]][badge-pinia-href]
[![vue-i18n][badge-vue-i18n-img]][badge-vue-i18n-href]
[![eslint][badge-eslint-img]][badge-eslint-href]
[![remark-cli][badge-remark-cli-img]][badge-remark-cli-href]
[![stylelint][badge-stylelint-img]][badge-stylelint-href]
[![vitest][badge-vitest-img]][badge-vitest-href]
[![storybook][badge-storybook-img]][badge-storybook-href]
[![vuepress][badge-vuepress-img]][badge-vuepress-href]
[![chromatic][badge-chromatic-img]][badge-chromatic-href]

The IT4C Boilerplate for frontends

![](src/assets/it4c-logo2-clean-bg_alpha-128x128.png)

## Requirements & Technology

To be able to build this project you need `nodejs`, `npm` and optional `docker` and `jq`.

The project uses `vite` as builder, `vike` to do the SSR. The design framework is `vuetify` which requires the frontend framework `vue3`. For localization `vue-i18n` is used; Session storage is handled with `pinia`.

Testing is done with `vitest` and code style is enforced with `eslint`, `remark-cli` and `stylelint`.

This projects utilizes `storybook` and `chromatic` to develop, document & test frontend components and `vuepress` for static documentation generation.

## Commands

The following commands are available:

| Command                     | Description                                      |
|-----------------------------|--------------------------------------------------|
| `npm install`               | Project setup                                    |
| `npm run build`             | Compiles and minifies for production             |
| `npm run server:prod`       | Runs productions server                          |
| **Develop**                 |                                                  |
| `npm run dev`               | Compiles and hot-reloads for development         |
| `npm run server:dev`        | Run development server                           |
| `npm run server:prod:ts`    | Run production server without build (ts-node)    |
| `npm run server:build`      | Build Server into an executable cjs file         |
| **Test**                    |                                                  |
| `npm run test:lint`         | Run all linters                                  |
| `npm run test:lint:eslint`  | Run linter eslint                                |
| `npm run test:lint:locales` | Run linter locales                               |
| `npm run test:lint:remark`  | Run linter remark                                |
| `npm run test:lint:style`   | Run linter stylelint                             |
| `npm run test:unit`         | Run all unit tests and generate coverage report  |
| `npm run test:unit:update`  | Run unit tests, coverage and update snapshots    |
| `npm run test:unit:dev`     | Run all unit tests in watch mode                 |
| `npm test`                  | Run all tests & linters                          |
| **Storybook**               |                                                  |
| `npm run storybook`         | Run Storybook                                    |
| `npm run storybook:build`   | Build static storybook                           |
| `npm run storybook:test`    | Run tests against all storybook stories          |
| **Documentation**           |                                                  |
| `npm run docs:dev`          | Run Documentation in development mode            |
| `npm run docs:build`        | Build static documentation                       |
| **Chromatic**               |                                                  |
| `npm run chromatic`         | Run Chromatic. See Chromatic section for details |
| **Maintenance**             |                                                  |
| `npm run update`            | Check for updates                                |

### Docker

Docker can be run in development mode utilizing `docker-compose.overwrite.yml`:
```bash
docker compose up
```

Docker can be run in production mode:
```bash
docker compose -f docker-compose.yml up
```

### Chromatic

In order to use the chromatic workflow you need to provide a `CHROMATIC_PROJECT_TOKEN` in the repository secrets.

If you want to run chromatic from the command line you either have to provide this variable as well
```bash
export CHROMATIC_PROJECT_TOKEN=...
npm run chromatic
```
or you have to append it via parameter:
```bash
npm run chromatic -- --project-token=...
```

### Update

You can get a list of packes to update by running `npm run update`.

Appending `-u ` will also update the packages in the `package.json`. You have to run `npm install` again after.

```bash
npm run update -- -u
npm install
```

## Endpoints

The following endpoints are provided given the right command is executed or all three if `docker compose` is used:

| Endpoint                                       | Description   |
|------------------------------------------------|---------------|
| [http://localhost:3000](http://localhost:3000) | Web           |
| [http://localhost:6006](http://localhost:6006) | Storybook     |
| [http://localhost:8080](http://localhost:8080) | Documentation |

## How to use as part of a project

If you want to use this as part of a larger project, e.g. in conjunction with a backend also utilizing a boilerplate you cannot use the template mechanic provided by github for this repository.

You can use the following commands to include the whole git history of the boilerplate and be able to update according to changes to this repo using another remote.

```bash
git remote add xxx_boilerplate_frontend git@github.com:IT4Change/boilerplate-frontend.git
git fetch xxx_boilerplate_frontend
git merge -s ours --no-commit --allow-unrelated-histories xxx_boilerplate_frontend/master
git read-tree --prefix=xxx/ -u xxx_boilerplate_frontend/master
git commit -m "Imported boilerplate_frontend as a subtree under xxx/."
```

To update the subtree you can use

```bash
git subtree pull -P xxx/ xxx_boilerplate_frontend master
git commit -m "Updated boilerplate_frontend in subtree under xxx/."
```

Where `xxx` refers to the folder and product part you want to use the boilerplate in. This assumes that you might need several copies of the frontend boilerplate for you product.

This mechanic was taken from this [source](https://stackoverflow.com/questions/1683531/how-to-import-existing-git-repository-into-another/8396318#8396318)

## TODO

- [ ] tests
- [ ] responsive design

## Known Problems

- [ ] [Image flicker](https://github.com/vuetifyjs/vuetify/issues/18772)
- [ ] [Black Buttons](https://github.com/vuetifyjs/vuetify/issues/18773)

## License

[Apache 2.0](./LICENSE)

<!-- Badges -->
[badge-nodejs-img]: https://img.shields.io/badge/nodejs-%3E%3D20.5.0-blue
[badge-nodejs-href]:  https://nodejs.org/

[badge-npm-img]: https://img.shields.io/badge/npm-latest-blue
[badge-npm-href]: https://www.npmjs.com/package/npm

[badge-docker-img]: https://img.shields.io/badge/docker-latest-blue
[badge-docker-href]: https://www.docker.com/

[badge-jq-img]: https://img.shields.io/badge/jq-latest-blue
[badge-jq-href]: https://jqlang.github.io/jq/

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

[badge-stylelint-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=devDependencies.stylelint&label=stylelint&color=yellow
[badge-stylelint-href]: https://stylelint.io/

[badge-vitest-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=devDependencies.vitest&label=vitest&color=yellow
[badge-vitest-href]: https://vitest.dev/

[badge-storybook-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=devDependencies.storybook&label=storybook&color=orange
[badge-storybook-href]: https://storybook.js.org/

[badge-vuepress-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=devDependencies.vuepress&label=vuepress&color=orange
[badge-vuepress-href]: https://vuepress.vuejs.org/

[badge-chromatic-img]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FIT4Change%2Fboilerplate-frontend%2Fmaster%2Fpackage.json&query=devDependencies.chromatic&label=chromatic&color=orange
[badge-chromatic-href]: https://www.chromatic.com/
