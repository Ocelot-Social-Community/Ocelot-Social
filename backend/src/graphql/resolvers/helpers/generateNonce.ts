import { branding } from '@src/branding/index'

// Digit-only confirmation code (easy to read/type from an email) for the registration + email-change
// flows (registration.ts, emails.ts). requestPasswordReset uses a separate crypto uuid substring
// instead (see passwordReset.ts) — a different alphabet and entropy source, not shared on purpose.
export default function generateNonce() {
  return Array.from(
    { length: branding.registration.nonceLength },
    // eslint-disable-next-line @typescript-eslint/no-useless-default-assignment
    (n: number = Math.floor(Math.random() * 10)) => {
      return String.fromCharCode(n + 48)
    },
  ).join('')
}
