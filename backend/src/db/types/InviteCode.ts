import { Integer, Node } from 'neo4j-driver'

export interface InviteCodeDbProperties {
  code: string
  createdAt: string
}

export type InviteCode = Node<Integer, InviteCodeDbProperties>
