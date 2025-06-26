import { Integer, Node } from 'neo4j-driver'

export interface CategoryDbProperties {
  createdAt: string
  icon: string
  id: string
  name: string
  slug: string
}

export type Category = Node<Integer, CategoryDbProperties>
