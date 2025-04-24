// Polyfill missing encoders in jsdom
// https://stackoverflow.com/questions/68468203/why-am-i-getting-textencoder-is-not-defined-in-jest
// import { TextEncoder, TextDecoder } from 'util'

// global.TextEncoder = TextEncoder
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
// global.TextDecoder = TextDecoder as any

// Metascraper takes longer nowadays, double time
// jest.setTimeout(10000)
