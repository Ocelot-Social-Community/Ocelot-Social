# Changelog

## [0.0.9](https://github.com/Ocelot-Social-Community/Ocelot-Social/compare/ui-v0.0.8...ui-v0.0.9) (2026-11-25)


### Features

* **other:** a count on osbadge, round around one digit ([#10797](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10797)) ([fd7ef75](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/fd7ef750e9855fdbc816649c4d69dc5db460771f))
* **other:** the moderation of a video call, in its participant list ([#10981](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10981)) ([a86f205](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/a86f20572039f6ca07412e601f42059fc9be2bfe))
* **other:** the open tab first, the others down to their symbol, and the call's chat its own ([#11144](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11144)) ([d971b7a](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/d971b7ae1f99258d49cb9812f063b3b9a7e47ca0))
* **other:** video call shall have much more space ([#10540](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10540)) ([d2dd10d](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/d2dd10d4f1774f47888e247d1951c59d3dceedb6))
* **package/ui:** a confirm dialog that takes its texts as props, modals with sizes and focus handling ([#10550](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10550)) ([8e8d24f](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/8e8d24f348ad23dafeea00a0ea4104bfda2477bb))
* **package/ui:** a drawer component, OsDrawer, slides in from a screen edge ([#10730](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10730)) ([363e6c6](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/363e6c64d8d4d72d08d38562a88535ed328f7a70))
* **package/ui:** fail verify on literal colours without a dark variant ([#11125](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11125)) ([8d0aeea](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/8d0aeeaf47381d22ca4248f027c2b785ea515f91))
* **package/ui:** the storybook renders the autodocs pages its stories ask for ([#10741](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10741)) ([22efc95](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/22efc95c43e48077383ed25f661d5eefb01e4036))
* **webapp:** dark mode — chat, video call and maps ([#10856](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10856)) ([e269837](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/e269837c845325b025901141f1782cc7a304395e))
* **webapp:** dark mode — theme tokens, theme switch, components and pages ([#10855](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10855)) ([d992289](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/d992289abf6ab7689330be1237bbd87c90e4207c))
* **webapp:** fullscreen for the video call ([#10542](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10542)) ([ab6753a](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/ab6753a2f8af12eba7aa7cffa223678b967f7317))


### Bug Fixes

* **package/ui:** a button whose icon or suffix slot shows nothing gets no empty gap ([#10875](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10875)) ([898bf7c](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/898bf7c0d890456a0d78ef39418e816effc9deef))
* **package/ui:** a dialog's close button no longer drops below its title under Vue 2 ([#10871](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10871)) ([34f8d7d](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/34f8d7d290eff7f93b871873108d5e3c901ce544))
* **package/ui:** take OsDrawer's panel colour from the theme tokens ([#11123](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11123)) ([dba143c](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/dba143c3797bd2cb40f243c4ce65611cb6d52850))
* **package/ui:** the open stories of OsModal no longer cover its docs page ([#10742](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10742)) ([68cb0fb](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/68cb0fb0e49da8e43c32c949b3c0022f70dfe78a))
* **webapp:** a brand's pinned and event ribbon colours take effect again ([#10905](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10905)) ([a70426f](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/a70426fd50573a89aee84250a8725d989ecc3c5d))
* **webapp:** filled surfaces and ribbons are darker in the dark mode, by what wcag aa asks ([#10906](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10906)) ([4085928](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/4085928525b7bf28ff7bb9786ba2170da3b3b8c8))
* **webapp:** the role tabs lock only fixed roles, set apart from the name ([#10868](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10868)) ([423a47b](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/423a47be8123c1bc58d220cdff1e76570195af99))


### Code Refactoring

* **other:** one light-dark() parser, and small leftovers of the dark mode ([#10882](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10882)) ([ef82273](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/ef82273303724c647adcbeee404e9013676d81f3))
* **webapp:** the theme switch icons live in packages/ui ([#10862](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10862)) ([421abd9](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/421abd9b6c8ebbf822db15592f166d993595d5c5))


### Build System & Dependencies

* **deps-dev:** bump @playwright/test from 1.64.1 to 1.65.0 in /packages/ui ([#10972](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10972)) ([bc40213](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/bc40213c04de97caa0d1fd884893b734d5233526))
* **deps-dev:** bump @playwright/test from 1.65.0 to 1.65.1 in /packages/ui ([#11028](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11028)) ([62d27ce](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/62d27ce4a950ebf2cd4cd3fdc4e69ae59ff30cc5))
* **deps-dev:** bump @tailwindcss/vite from 4.1.18 to 4.3.5 in /packages/ui/examples/vue2-tailwind ([#11000](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11000)) ([9adef33](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/9adef3319bb7413bb31925d6ddb1b5efb7bc4b22))
* **deps-dev:** bump @tailwindcss/vite from 4.1.18 to 4.3.5 in /packages/ui/examples/vue3-tailwind ([#11042](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11042)) ([c0cdcc2](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/c0cdcc210fe77bc40ad80ec5f7972531baa46690))
* **deps-dev:** bump @types/node from 26.6.5 to 26.6.6 in /packages/ui ([#10834](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10834)) ([a2aa377](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/a2aa377d457f9f95c8784bed0cb8086d76905477))
* **deps-dev:** bump @vitejs/plugin-vue from 6.0.4 to 6.0.11 in /packages/ui/examples/vue3-css ([#11019](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11019)) ([4708953](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/47089533ad8916179e54ceff82ffd14a49527938))
* **deps-dev:** bump @vitejs/plugin-vue from 6.0.4 to 6.0.11 in /packages/ui/examples/vue3-tailwind ([#11006](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11006)) ([747eb70](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/747eb70f59b698503967b7e0dc18d81a0863fd1a))
* **deps-dev:** bump @vue/test-utils from 2.4.6 to 2.6.0 in /packages/ui/examples/vue3-css ([#11001](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11001)) ([a501305](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/a501305ea38615b0c61fba0e6c8c364996e48ba0))
* **deps-dev:** bump @vue/test-utils from 2.4.6 to 2.6.0 in /packages/ui/examples/vue3-tailwind ([#11013](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11013)) ([a5bf1c5](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/a5bf1c5865f6acac875e70c26413c8b45580bffd))
* **deps-dev:** bump @vue/test-utils from 2.5.1 to 2.6.0 in /packages/ui in the vue group ([#10997](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10997)) ([179e082](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/179e08200b127f774c95224c39751e059ce03f4a))
* **deps-dev:** bump eslint from 10.12.0 to 10.13.0 in /packages/ui ([#10706](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10706)) ([10f9803](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/10f98030e74b06d4fc4dc9a264540a9f0ba1552d))
* **deps-dev:** bump eslint from 10.13.0 to 10.14.0 in /packages/ui ([#10832](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10832)) ([f4710c4](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/f4710c44585b916e7ae807e6b5eb5310d2c29e1f))
* **deps-dev:** bump eslint from 10.13.0 to 10.15.0 in /packages/ui/examples/vue2-css ([#11024](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11024)) ([65cc754](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/65cc7541546ecf3f4a9963d3820d49e47750d4d1))
* **deps-dev:** bump eslint from 10.13.0 to 10.15.0 in /packages/ui/examples/vue2-tailwind ([#11014](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11014)) ([cc539c2](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/cc539c230364f62f560f75138df6b04dd8118458))
* **deps-dev:** bump eslint from 10.13.0 to 10.15.0 in /packages/ui/examples/vue3-css ([#11038](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11038)) ([1904c2a](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/1904c2ab5451327317729255dfc2b4eec9d7c090))
* **deps-dev:** bump eslint from 10.13.0 to 10.15.0 in /packages/ui/examples/vue3-tailwind ([#11034](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11034)) ([84cc460](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/84cc4606296ff91d887a38f833d0d8c987d62e08))
* **deps-dev:** bump eslint from 10.14.0 to 10.15.0 in /packages/ui ([#11021](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11021)) ([ee65f6c](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/ee65f6c6a2d7a279b2ed4690e2bf3ab5495f3e53))
* **deps-dev:** bump eslint-plugin-jsdoc from 65.3.6 to 65.4.0 in /packages/ui ([#10711](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10711)) ([a50b91c](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/a50b91c80a8716718231c727dd3c510c0bf8de95))
* **deps-dev:** bump eslint-plugin-jsdoc from 65.4.0 to 65.4.2 in /packages/ui ([#10770](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10770)) ([46c5f5b](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/46c5f5b4c4ab4a47e451e12b3d213e3bdaa9a945))
* **deps-dev:** bump eslint-plugin-jsdoc from 65.4.11 to 65.5.0 in /packages/ui ([#11102](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11102)) ([65c1ea5](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/65c1ea58cdd7870e41d337598d8ed1abe10316ff))
* **deps-dev:** bump eslint-plugin-jsdoc from 65.4.2 to 65.4.3 in /packages/ui ([#10849](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10849)) ([e329cf6](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/e329cf685ca61e373c53dd20e73eb6875a75f3d9))
* **deps-dev:** bump eslint-plugin-jsdoc from 65.4.3 to 65.4.5 in /packages/ui ([#10970](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10970)) ([30eb8f8](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/30eb8f8615a0490b7ec56bcb13b6178ac8b84862))
* **deps-dev:** bump eslint-plugin-jsdoc from 65.4.5 to 65.4.11 in /packages/ui ([#11010](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11010)) ([3d35354](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/3d35354acbf8bafe9a6559b57a1bc6d55119235d))
* **deps-dev:** bump eslint-plugin-playwright from 2.12.1 to 2.12.2 in /packages/ui ([#10833](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10833)) ([48ca7f3](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/48ca7f372375dd469189568e16803a90fccc89c4))
* **deps-dev:** bump eslint-plugin-vuejs-accessibility from 2.6.2 to 2.6.3 in /packages/ui ([#10767](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10767)) ([a066ca9](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/a066ca9e4fb4d0f32f354186cf7b7d4fd5655dc3))
* **deps-dev:** bump glob from 13.0.6 to 14.0.2 in /packages/ui ([#10763](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10763)) ([d562967](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/d5629679f7ff001e65f521747a78ea0dae8578d4))
* **deps-dev:** bump glob from 14.0.2 to 14.0.3 in /packages/ui ([#10831](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10831)) ([87c66fb](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/87c66fb6b59bf1d32923160e5e18968f15400868))
* **deps-dev:** bump glob from 14.0.3 to 14.0.4 in /packages/ui ([#10973](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10973)) ([5798ff7](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/5798ff7c53c6267cd5c4f3b524ea45a1fd498b53))
* **deps-dev:** bump glob from 14.0.4 to 14.0.6 in /packages/ui ([#11016](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11016)) ([c3d15fa](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/c3d15faabe548a48c51ea94238cd7ac25170facf))
* **deps-dev:** bump jsdom from 28.0.0 to 31.0.1 in /packages/ui/examples/vue2-css ([#11009](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11009)) ([7702834](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/7702834b2b10391ca2a155331e4a0ccba9e42f6d))
* **deps-dev:** bump jsdom from 28.0.0 to 31.0.1 in /packages/ui/examples/vue2-tailwind ([#11005](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11005)) ([8cd5633](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/8cd56330f478f44d373c7ad29bbd31f54cc005b2))
* **deps-dev:** bump jsdom from 28.0.0 to 31.0.1 in /packages/ui/examples/vue3-css ([#11031](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11031)) ([5f2c078](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/5f2c078eef7f195f2c5cc95945d341341ebba863))
* **deps-dev:** bump jsdom from 28.0.0 to 31.0.1 in /packages/ui/examples/vue3-tailwind ([#11027](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11027)) ([e22745d](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/e22745d8024a8d369170307c920d9285085b9a03))
* **deps-dev:** bump jsdom from 30.1.3 to 31.0.0 in /packages/ui ([#10975](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10975)) ([ca8e8be](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/ca8e8bea4978e17147093616fd775e256dfecde4))
* **deps-dev:** bump jsdom from 31.0.0 to 31.0.1 in /packages/ui ([#11002](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11002)) ([6fe8c81](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/6fe8c8103381cfe723c853c5c1b9114c1441af3f))
* **deps-dev:** bump tailwind-csstree from 0.4.1 to 0.4.2 in /packages/ui ([#10835](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10835)) ([4e0f3bd](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/4e0f3bd52b6e10b989e44768789ee87d1a0ea4a6))
* **deps-dev:** bump tailwindcss from 4.1.18 to 4.3.5 in /packages/ui/examples/vue3-tailwind ([#11023](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11023)) ([a28ae31](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/a28ae314c908f35a967450723d0e30cea47ccff7))
* **deps-dev:** bump the size-limit group in /packages/ui with 2 updates ([#10754](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10754)) ([bbe39fb](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/bbe39fb859cadce150dd9874a24ae73a61eaa170))
* **deps-dev:** bump the storybook group in /packages/ui with 3 updates ([#10702](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10702)) ([82f5fdd](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/82f5fdde2b622ff598a458b13be91a40fdf2ee30))
* **deps-dev:** bump the storybook group in /packages/ui with 4 updates ([#10759](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10759)) ([430092a](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/430092a38ca40d5f5738e2fa06ebe4d7737625a6))
* **deps-dev:** bump the storybook group in /packages/ui with 4 updates ([#10960](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10960)) ([4a59e05](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/4a59e057846fe1a7a850eb0762a092beecec288f))
* **deps-dev:** bump the storybook group in /packages/ui with 4 updates ([#11098](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11098)) ([9952a43](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/9952a430d0b1cd5069d644e08b3aef5d2f448112))
* **deps-dev:** bump the tailwind group in /packages/ui with 3 updates ([#10848](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10848)) ([3e99b73](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/3e99b7381140eb2449cc3d0c17715eb58e449a9f))
* **deps-dev:** bump the tailwind group in /packages/ui with 3 updates ([#10964](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10964)) ([eed6a2f](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/eed6a2f6b0fc777d98064dca8e5e8d8904f181f0))
* **deps-dev:** bump the vitest group in /packages/ui with 2 updates ([#10830](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10830)) ([5a3cd6f](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/5a3cd6fda31960488b7a3102c47abd4ee0ce131f))
* **deps-dev:** bump the vitest group in /packages/ui with 2 updates ([#11100](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11100)) ([c84dc58](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/c84dc5866e87555516a90e164c3aa5be66f52852))
* **deps-dev:** bump vite from 7.3.1 to 8.3.8 in /packages/ui/examples/vue3-css ([#11043](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11043)) ([def62aa](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/def62aa43f14b62c8a03fcb0502b329f9363f760))
* **deps-dev:** bump vite from 7.3.1 to 8.3.8 in /packages/ui/examples/vue3-tailwind ([#10999](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10999)) ([1de313b](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/1de313b1a80bdd947c4fb6ba9ae5c4cbfb943aee))
* **deps-dev:** bump vitest from 4.0.18 to 5.1.0 in /packages/ui/examples/vue2-css ([#11015](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11015)) ([ff4ea5c](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/ff4ea5c0aa5b48b62162545bfdbd2cefabca9af6))
* **deps-dev:** bump vitest from 4.0.18 to 5.1.0 in /packages/ui/examples/vue3-css ([#11025](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11025)) ([f42f655](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/f42f6556f296c9b83caceb85b8c588065a50ecaf))
* **deps-dev:** bump vitest from 4.0.18 to 5.1.0 in /packages/ui/examples/vue3-tailwind ([#11045](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11045)) ([2759396](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/27593968d365462ffe877fdb934db933b6f668d7))
* **deps-dev:** bump vitest from 4.0.18 to 5.1.1 in /packages/ui/examples/vue2-tailwind ([#11020](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11020)) ([47ae7da](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/47ae7da96c23ce6dcafdb5f66ed2bb2042e169d1))
* **deps-dev:** bump vitest from 5.1.0 to 5.1.1 in /packages/ui/examples/vue2-css ([#11118](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11118)) ([31088ff](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/31088ff1c96ce3176efb6f83a31cca628703324b))
* **deps-dev:** bump vitest from 5.1.0 to 5.1.1 in /packages/ui/examples/vue3-css ([#11120](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11120)) ([174984d](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/174984d783e2cf38e0ded9b25924e632d60779fb))
* **deps-dev:** bump vitest from 5.1.0 to 5.1.1 in /packages/ui/examples/vue3-tailwind ([#11116](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11116)) ([19aa248](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/19aa2486e4ce2bc88d3f949830577a2f51a3fb45))
* **deps-dev:** bump vue from 3.5.44 to 3.5.45 in /packages/ui in the vue group ([#10965](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10965)) ([77ceea4](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/77ceea433bc0c819ed3d238cfc2506c588579713))
* **deps-dev:** bump vue from 3.5.45 to 3.5.46 in /packages/ui in the vue group ([#11099](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11099)) ([1bed7d5](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/1bed7d5763bdd1ae0a0bb07c63e2dd3403bef853))
* **deps-dev:** bump vue-tsc from 3.3.13 to 3.3.14 in /packages/ui in the vue group ([#10829](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10829)) ([dc6d7ca](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/dc6d7ca8eabf30ebd5165a3a4cf395152f840216))
* **deps:** bump node from 26.12.0-alpine to 26.12.1-alpine in /packages/ui ([#10772](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10772)) ([26f78c6](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/26f78c6add9d3da1109d2746463475398335bcea))
* **deps:** bump node from 26.12.1-alpine to 26.13.0-alpine in /packages/ui ([#10810](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10810)) ([aca4060](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/aca40609eccbcd64db18846720d6c23e533758a0))
* **deps:** bump node from 26.13.0-alpine to 26.13.1-alpine in /packages/ui ([#11053](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11053)) ([94f7526](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/94f75262b151f97c818f4c8868999e4d794b85b3))
* **deps:** bump vue from 3.5.27 to 3.5.45 in /packages/ui/examples/vue3-css ([#11008](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11008)) ([329b8f9](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/329b8f950b44154dd4fc6e5d4fa167b830f5b238))
* **deps:** bump vue from 3.5.27 to 3.5.45 in /packages/ui/examples/vue3-tailwind ([#11037](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11037)) ([dc37d84](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/dc37d84d8d95965d2d0c5703131e6046b648834f))
* **deps:** bump vue from 3.5.45 to 3.5.46 in /packages/ui/examples/vue3-css ([#11119](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11119)) ([eda3f28](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/eda3f280cd548926d67b430af69b3bc28052b066))
* **deps:** bump vue from 3.5.45 to 3.5.46 in /packages/ui/examples/vue3-tailwind ([#11117](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/11117)) ([e69bbda](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/e69bbda866ab24a7de0d0f3534b9bba75f0baf35))

## [0.0.8](https://github.com/Ocelot-Social-Community/Ocelot-Social/compare/ui-v0.0.7...ui-v0.0.8) (2026-10-20)


### Tests

* **other:** visual regression tolerates no differing pixel ([#10558](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10558)) ([b844b4b](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/b844b4b3f8711ad6692684263249e5e2a064349f))


### Build System & Dependencies

* **deps-dev:** bump @axe-core/playwright from 4.13.0 to 4.14.0 in /packages/ui ([#10668](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10668)) ([9828637](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/98286370ca45d8e29b6b7c151302452be4818014))
* **deps-dev:** bump @playwright/test from 1.63.0 to 1.64.0 in /packages/ui ([#10581](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10581)) ([e231523](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/e2315239e55ef6d0592778dc1e482282fa0ff45d))
* **deps-dev:** bump @playwright/test from 1.64.0 to 1.64.1 in /packages/ui ([#10666](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10666)) ([8a559c4](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/8a559c4160457609c38a42773b83e809effda297))
* **deps-dev:** bump @types/node from 26.6.4 to 26.6.5 in /packages/ui ([#10587](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10587)) ([cdca991](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/cdca991125baa584e274be56ff8c6f50b817291f))
* **deps-dev:** bump eslint-plugin-jsdoc from 65.1.0 to 65.3.2 in /packages/ui ([#10589](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10589)) ([d1899cf](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/d1899cf85d747db0787fe18dda11d3140633f320))
* **deps-dev:** bump eslint-plugin-jsdoc from 65.3.2 to 65.3.6 in /packages/ui ([#10673](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10673)) ([ee15263](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/ee152632cff78b0d9de0a6df7da8ac3400a755b1))
* **deps-dev:** bump eslint-plugin-vuejs-accessibility from 2.6.0 to 2.6.2 in /packages/ui ([#10586](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10586)) ([c5d5c0b](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/c5d5c0b45e168d36c63e35f82937e80e9dbe0b58))
* **deps-dev:** bump jsdom from 30.1.2 to 30.1.3 in /packages/ui ([#10672](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10672)) ([bc1d314](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/bc1d31437358fdd9b8b23cc2cb611f3a90399dd4))
* **deps-dev:** bump the size-limit group in /packages/ui with 2 updates ([#10569](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10569)) ([fd29c5c](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/fd29c5c195dc53d90a9464fa59d25ad07dfbd1d8))
* **deps-dev:** bump the storybook group in /packages/ui with 3 updates ([#10574](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10574)) ([fdb5f22](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/fdb5f228a01d6a9e03c1b99d7900695b893c6c17))
* **deps-dev:** bump the vitest group in /packages/ui with 2 updates ([#10579](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10579)) ([3688b16](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/3688b16e00e47dcf9226c5ea992924731b880399))
* **deps-dev:** bump the vitest group in /packages/ui with 2 updates ([#10674](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10674)) ([61aecbd](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/61aecbd7f3909ba0847079eb6413487eae00e2b7))
* **deps-dev:** bump the vue group in /packages/ui with 2 updates ([#10577](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10577)) ([675a05e](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/675a05e0fcba7857d9aca4bb0f160b9b1875ae5d))
* **deps:** bump node from 26.10.0-alpine to 26.11.1-alpine in /packages/ui ([#10582](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10582)) ([c16e851](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/c16e8518c95982286898428bf391ab113d4c3d26))
* **deps:** bump node from 26.11.1-alpine to 26.12.0-alpine in /packages/ui ([#10667](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10667)) ([d25c1f3](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/d25c1f346e2337c506f6ae70f5cef55b8d208319))
* **other:** eslint-config-it4c 0.14.1 in every package ([#10676](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10676)) ([388c15c](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/388c15ca8123ec44d807c6572f66fc6bb4818726))

## [0.0.7](https://github.com/Ocelot-Social-Community/Ocelot-Social/compare/ui-v0.0.6...ui-v0.0.7) (2026-10-11)


### Build System & Dependencies

* **deps-dev:** bump @types/node from 26.6.2 to 26.6.4 in /packages/ui ([#10378](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10378)) ([8c2e14c](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/8c2e14c2f6973227c94d4137adff74d56a388d5f))
* **deps-dev:** bump eslint from 10.11.0 to 10.12.0 in /packages/ui ([#10445](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10445)) ([eac44ca](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/eac44ca2a7d5478251d5abc8079dcbf3bd072d0f))
* **deps-dev:** bump eslint-plugin-playwright from 2.12.0 to 2.12.1 in /packages/ui ([#10446](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10446)) ([f6e4117](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/f6e4117133af13bce85c6ceca7b1166b9f570848))
* **deps-dev:** bump jsdom from 30.1.1 to 30.1.2 in /packages/ui ([#10447](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10447)) ([766fed8](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/766fed8495f123e91fad2837f76aa29bfb5570ea))
* **deps-dev:** bump publint from 0.3.24 to 0.3.25 in /packages/ui ([#10449](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10449)) ([b8b4b23](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/b8b4b23f0398aa514a409a4dcf7bcc99c7e0e906))
* **deps-dev:** bump the storybook group across 1 directory with 3 updates ([#10375](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10375)) ([c18bb02](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/c18bb02df588f26e6ad810f901c9cadcffae165f))
* **deps-dev:** bump the vitest group across 1 directory with 2 updates ([#10377](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10377)) ([8d770d5](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/8d770d5c4301f534e14d4bac2f92983ecb93f700))
* **deps-dev:** bump vue-tsc from 3.3.11 to 3.3.12 in /packages/ui in the vue group across 1 directory ([#10444](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10444)) ([1089e26](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/1089e267924675ec049ff67cfc56ff8ed8f03b64))
* **other:** bump eslint-plugin-jsdoc from 64.5.4 to 65.1.0 in /packages/ui ([#10448](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10448)) ([db67202](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/db672020967f2b412dc059d0d65a1babd2f45f5e))

## [0.0.6](https://github.com/Ocelot-Social-Community/Ocelot-Social/compare/ui-v0.0.5...ui-v0.0.6) (2026-10-05)


### Build System & Dependencies

* **deps-dev:** bump the size-limit group across 1 directory with 2 updates ([#10373](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10373)) ([f226a5b](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/f226a5b42cc1c4533710c7f057175a89641ac3e9))

## [0.0.5](https://github.com/Ocelot-Social-Community/Ocelot-Social/compare/ui-v0.0.4...ui-v0.0.5) (2026-10-05)


### Features

* **ui:** OsToggleGroup — a row of buttons of which one is current, with radio keyboard ([#10388](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10388)) ([9c290b6](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/9c290b6192bee0cb352d19b86188ad2c0e787c62))


### Bug Fixes

* **other:** fix some little bugs in release v3.19.0 ([#10345](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10345)) ([9c8e238](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/9c8e238ae6ed1ebbd5de99f883c6c1ed7fed8d6c))


### Build System & Dependencies

* **deps-dev:** bump @types/node from 26.6.1 to 26.6.2 in /packages/ui ([#10321](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10321)) ([31db7e1](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/31db7e18328c4b687a8761cc164b78e932d6605d))
* **deps-dev:** bump eslint from 10.10.0 to 10.11.0 in /packages/ui ([#10320](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10320)) ([2260d2d](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/2260d2de17ea0d5a3769e79eeb17fd38cb193e94))
* **deps-dev:** bump eslint-plugin-jsdoc from 64.5.3 to 64.5.4 in /packages/ui ([#10317](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10317)) ([6a3e2de](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/6a3e2de2ae721c3ea1fd239803b352ed6160fa86))
* **deps-dev:** bump jsdom from 30.0.1 to 30.1.1 in /packages/ui ([#10319](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10319)) ([2bab5b6](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/2bab5b65f07e858e91c45fd72275d2eea41fe173))
* **deps-dev:** bump tailwind-csstree from 0.4.0 to 0.4.1 in /packages/ui ([#10380](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10380)) ([2250030](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/2250030f887b4def46b415b9d6eabcdea2a0f776))
* **deps-dev:** bump the vue group across 1 directory with 2 updates ([#10316](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10316)) ([2ab3d65](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/2ab3d655e9c73d70352609a4e038b70445add7f2))
* **deps-dev:** bump tsx from 4.23.13 to 4.23.15 in /packages/ui ([#10318](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10318)) ([da0441f](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/da0441fc7bfaa87f1b13478a0daf01733b9cc22d))
* **deps:** bump node from 26.8.2-alpine to 26.10.0-alpine in /packages/ui ([#10323](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10323)) ([8678670](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/86786706cf9293f3e1ea9d180e0b520d85b1e92f))

## [0.0.4](https://github.com/Ocelot-Social-Community/Ocelot-Social/compare/ui-v0.0.3...ui-v0.0.4) (2026-09-22)


### Features

* **other:** map for events ([#10025](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10025)) ([fe32632](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/fe3263264bb0a6e567615e4f3ac0eac6ca9c9921))
* **other:** use validation hint component on group form ([#10259](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10259)) ([0b2e0f3](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/0b2e0f35209e545163fea5e92f04c89f741aa678))


### Bug Fixes

* **other:** update .tools-versions to node26 ([#10209](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10209)) ([08012fd](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/08012fdcfabcd2347c16c173073403fc4197616b))
* **package/ui:** bump size-limit package ([#10207](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10207)) ([8445efb](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/8445efb0995e51deccb5041b9d3010b4b773fb1b))
* **package/ui:** update eslint-config-it4c & dependencies ([#10074](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10074)) ([2f85dcf](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/2f85dcfc0ab6a1d5ffebc942e8f569be91bbdacb))

## [0.0.3](https://github.com/Ocelot-Social-Community/Ocelot-Social/compare/ui-v0.0.2...ui-v0.0.3) (2026-08-15)


### Bug Fixes

* **workflow:** fix release please ([#10054](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/10054)) ([9b0249c](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/9b0249c55bb0f2a97834ee2ecfdc5d9434f06c54))

## [0.0.2](https://github.com/Ocelot-Social-Community/Ocelot-Social/compare/ui-v0.0.1...ui-v0.0.2) (2026-08-14)


### Features

* **maintenance:** new maintenance page ([#9445](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9445)) ([01a951e](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/01a951e77b8e2b7a74f47e6fbb69f2028cf90f22))
* **package/ui:** actionButton + labledButton ([#9470](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9470)) ([e144170](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/e144170cf065a761ac9c95efab3088b586cb96a7))
* **package/ui:** os-badge ([#9250](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9250)) ([951a24f](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/951a24f100cf735751ea43750186fa36fada9171))
* **package/ui:** os-button suffix slot ([#9242](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9242)) ([282d4a3](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/282d4a33eb8ab8932e4500ee5065e07985a3c19b))
* **package/ui:** os-counter-icon ([#9471](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9471)) ([202c869](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/202c869515e493eba10daaa33b8c6fefe8d242ee))
* **package/ui:** os-icon ([#9234](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9234)) ([fc714a5](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/fc714a5f303cb443b52799090db0cdffa7a1e7bb))
* **package/ui:** os-menu ([#9431](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9431)) ([75c1232](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/75c12328606b5a5aec19ba7a46d3e3c353bc59ac))
* **package/ui:** os-modal & webapp integration ([#9375](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9375)) ([237798b](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/237798b0f0b9002d524c3f24486f0e00d81d4af9))
* **package/ui:** os-number ([#9254](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9254)) ([bbad57b](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/bbad57bbc7cefe6aaeb1446c742bc36ec65faacd))
* **webapp:** more button icons, more loading states ([#9243](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9243)) ([c0a7965](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/c0a7965d24280675f6ca33ecb58c02cd2fc02748))
* **webapp:** move validation-hint component to package/ui ([#9947](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9947)) ([e191da8](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/e191da86884c12d765b60502b942f52de1625f8e))
* **webapp:** push to top indicator ([#9237](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9237)) ([0cbdfea](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/0cbdfea5a1169eaa31f7e04dd128db1bda7fb56a))
* **webapp:** replace language switch logo ([#9475](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9475)) ([b078307](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/b07830769d44de29acabb52fa0614ff6b5b745df))


### Bug Fixes

* **other:** fix backup uploads PVC script and update UI project notes ([#9974](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9974)) ([56ab655](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/56ab6555c9fe58619af15c36a7cd044d85afb5be))
* **package/ui:** fix package ui regression target on icons ([#9479](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9479)) ([9cba88c](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/9cba88cb68bdf5258216279dcf0301574d5e4b6a))
* **package/ui:** os-button class to ensure branding compatibility ([#9211](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9211)) ([f4fe855](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/f4fe8553de78d02d627c10df59d66d7a06c285b7))
* **package/ui:** override active hover effect of disabled button to not create visual glitches when button state changes ([#9408](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9408)) ([194fc53](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/194fc53ade76355063473ba097f5f474e6102211))
* **package/ui:** update eslint-config-it4c & fix lint errors ([#9368](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9368)) ([5ad0689](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/5ad0689ddae5497273f549a0df74cdb1ecf8afe5))
* **webapp:** add responsive mobile menu with locale switching and filter support ([#9281](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9281)) ([9548ad6](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/9548ad6e313f547e93778bf78e880d2527ec1f49))
* **webapp:** fix group chat room floating window change ([#9753](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9753)) ([cc086aa](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/cc086aad35ee7313d958e0b83b19dacd3e2c5110))
* **webapp:** fix map & user-teaser ([#9484](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9484)) ([4245d2c](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/4245d2cbd4d6964ef5ad62cffd16507899f3950a))
* **webapp:** remove cookie-name from branding and move it into env ([#9965](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/9965)) ([46c80ea](https://github.com/Ocelot-Social-Community/Ocelot-Social/commit/46c80eac42856226fef2229753377c4d4a607758))
