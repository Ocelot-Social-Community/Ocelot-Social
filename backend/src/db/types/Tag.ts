import { Integer, Node } from 'neo4j-driver'

export interface TagDbProperties {
  deleted: boolean
  disabled: boolean
  id: string
  updatedAt: string
}

export type Tag = Node<Integer, TagDbProperties>
