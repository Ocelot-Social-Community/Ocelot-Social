import CONSTANTS_REGISTRATION from './../../../constants/registration'

// TODO: why this is not used in resolver 'requestPasswordReset'?
export default function generateNonce() {
  return Array.from(
    { length: CONSTANTS_REGISTRATION.NONCE_LENGTH },
    (n:number = Math.floor(Math.random() * 10)) => {
      return String.fromCharCode(n + 48)
    },
  ).join('')
}
