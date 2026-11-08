import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import chat from './chat'

// The chat library writes its own --chat-message-color onto its element. A style value that reads
// the same name would read itself there and be dropped, and a brand's value would never arrive.
describe('chat style', () => {
  it('hands the message colour over under another name than the library uses', () => {
    expect(chat.STYLE.message.color).toBe('var(--chat-message-text-color)')
  })

  it('paints the chat header with the token of the other room headers', () => {
    expect(chat.STYLE.header.background).toBe('var(--room-header-background)')
  })

  it('defines that name from the brand-facing token', () => {
    const css = readFileSync(resolve(__dirname, '../assets/css/root-tokens.css'), 'utf8')
    expect(css).toMatch(/--chat-message-text-color:\s*var\(--chat-message-color\);/)
  })
})
