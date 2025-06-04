import { Integer, Node } from 'neo4j-driver'

export interface ImageDbProperties {
  alt: string
  aspectRatio: number
  createdAt: string
  sensitive: boolean
  type: string
  url: string
}

export type Image = Node<Integer, ImageDbProperties>
