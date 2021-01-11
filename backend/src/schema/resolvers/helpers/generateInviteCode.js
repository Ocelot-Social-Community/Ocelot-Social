export default function generateInviteCode() {
  return Array.from({ length: 6 }, (n = Math.floor(Math.random() * 36)) => {
    return String.fromCharCode(n > 9 ? n + 55 : n + 48)
  }).join('')
}
