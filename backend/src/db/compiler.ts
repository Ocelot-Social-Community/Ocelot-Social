/* eslint-disable import/no-commonjs */
// eslint-disable-next-line n/no-unpublished-require
const tsNode = require('ts-node')
// eslint-disable-next-line import/no-unassigned-import, import/no-extraneous-dependencies, n/no-unpublished-require
require('tsconfig-paths/register')

module.exports = tsNode.register
