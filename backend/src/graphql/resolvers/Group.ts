import { Integer, Node } from 'neo4j-driver'

export interface GroupDbProperties {
  about: string
  actionRadius: string
  createdAt: string
  deleted: boolean
  description: string
  descriptionExcerpt: string
  disabled: boolean
  groupType: string
  id: string
  locationName?: string
  name: string
  slug: string
  updatedAt: string
}

export type Group = Node<Integer, GroupDbProperties>
