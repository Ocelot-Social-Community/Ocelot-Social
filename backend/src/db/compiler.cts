// `.cts`, not `.ts`: the `migrate` CLI loads this file with require(), and since the package is
// `"type": "module"` a plain `.ts` is ESM — where `require`/`module.exports` do not exist. The
// .cts extension marks it as CommonJS for both Node's type stripping and tsc.
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable import-x/no-commonjs */
// eslint-disable-next-line n/no-unpublished-require
const tsx = require('tsx/cjs/api')

module.exports = tsx.register
