import { Integer, Node } from 'neo4j-driver'

export interface EmailAddressDbProperties {
  createdAt: string
  verifiedAt: string
  nonce: string
  email: string
}

export type EmailAddress = Node<Integer, EmailAddressDbProperties>
