export default function generateNonce() {
  return Array.from({ length: 5 }, (n = Math.floor(Math.random() * 10)) => {
    return String.fromCharCode(n + 48)
  }).join('')
}
