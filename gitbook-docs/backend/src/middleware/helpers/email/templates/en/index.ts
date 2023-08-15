import fs from 'fs'
import path from 'path'

const readFile = (fileName) => fs.readFileSync(path.join(__dirname, fileName), 'utf-8')

export const notification = readFile('./notification.html')
