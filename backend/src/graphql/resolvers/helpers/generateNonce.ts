import registrationConstants from '@constants/registrationBranded'

// TODO: why this is not used in resolver 'requestPasswordReset'?
export default function generateNonce() {
  return Array.from(
    { length: registrationConstants.NONCE_LENGTH },
    // eslint-disable-next-line @typescript-eslint/no-useless-default-assignment
    (n: number = Math.floor(Math.random() * 10)) => {
      return String.fromCharCode(n + 48)
    },
  ).join('')
}
