// Polyfill missing encoders in jsdom
// https://stackoverflow.com/questions/68468203/why-am-i-getting-textencoder-is-not-defined-in-jest
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Metascraper takes longer nowadays, double time
jest.setTimeout(10000)