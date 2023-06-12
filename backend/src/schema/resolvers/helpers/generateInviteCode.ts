import CONSTANTS_REGISTRATION from './../../../constants/registration'

export default function generateInviteCode() {
  // 6 random numbers in [ 0, 35 ] are 36 possible numbers (10 [0-9] + 26 [A-Z])
  return Array.from(
    { length: CONSTANTS_REGISTRATION.INVITE_CODE_LENGTH },
    (n = Math.floor(Math.random() * 36)) => {
      // n > 9: it is a letter (ASCII 65 is A) -> 10 + 55 = 65
      // else: it is a number (ASCII 48 is 0) -> 0 + 48 = 48
      return String.fromCharCode(n > 9 ? n + 55 : n + 48)
    },
  ).join('')
}
