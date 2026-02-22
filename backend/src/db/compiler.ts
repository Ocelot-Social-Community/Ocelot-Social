/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable import-x/no-commonjs */
// eslint-disable-next-line n/no-unpublished-require
const tsNode = require('ts-node')
// eslint-disable-next-line import-x/no-unassigned-import, n/no-unpublished-require
require('tsconfig-paths/register')

module.exports = tsNode.register
