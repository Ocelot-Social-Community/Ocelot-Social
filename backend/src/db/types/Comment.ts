import { Integer, Node } from 'neo4j-driver'

export interface CommentDbProperties {
  content: string
  contentExcerpt: string
  createdAt: string
  deleted: boolean
  disabled: boolean
  id: string
  updatedAt: string
}

export type Comment = Node<Integer, CommentDbProperties>
