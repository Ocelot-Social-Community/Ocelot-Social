import jwt from 'jsonwebtoken'
import CONFIG from './../config'

// Generate an Access Token for the given User ID
export default function encode(user) {
  const { id, name, slug } = user
  const token = jwt.sign({ id, name, slug }, CONFIG.JWT_SECRET, {
    expiresIn: CONFIG.JWT_EXPIRES,
    issuer: CONFIG.GRAPHQL_URI,
    audience: CONFIG.CLIENT_URI,
    subject: user.id.toString(),
  })
  return token
}
