import { Integer, Node } from 'neo4j-driver'

export interface EmailAddressDbProperties {
  createdAt: string
  email: string
  nonce: string
  verifiedAt: string
}

export type EmailAddress = Node<Integer, EmailAddressDbProperties>
