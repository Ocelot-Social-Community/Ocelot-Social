import { Integer, Node } from 'neo4j-driver'

export interface PostDbProperties {
  clickedCount: number
  content: string
  contentExcerpt: string
  createdAt: string
  deleted: boolean
  disabled: boolean
  id: string
  language: string
  postType: string // this is a PostType[] in the graphql, mapped from the labels
  slug: string
  sortDate: string
  title: string
  updatedAt: string
  viewedTeaserCount: number
}

export type Post = Node<Integer, PostDbProperties>
export type Article = Node<Integer, PostDbProperties>
