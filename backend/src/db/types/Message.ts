import { Integer, Node } from 'neo4j-driver'

export interface MessageDbProperties {
  content: string
  createdAt: string
  distributed: boolean
  id: string
  indexId: number
  saved: boolean
  seen: boolean
}

export type Message = Node<Integer, MessageDbProperties>
