/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'node:fs'
import path from 'node:path'

// eslint-disable-next-line n/no-sync
const readFile = (fileName) => fs.readFileSync(path.join(__dirname, fileName), 'utf-8')

export const notification = readFile('./notification.html')
