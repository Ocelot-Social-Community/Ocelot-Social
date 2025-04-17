import { hashSync } from 'bcryptjs'

export default function (args) {
  // eslint-disable-next-line n/no-sync
  args.encryptedPassword = hashSync(args.password, 10)
  delete args.password
  return args
}
