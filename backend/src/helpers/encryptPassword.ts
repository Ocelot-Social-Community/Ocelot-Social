/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { hashSync } from 'bcryptjs'

export default function (args) {
  args.encryptedPassword = hashSync(args.password, 10)
  delete args.password
  return args
}
