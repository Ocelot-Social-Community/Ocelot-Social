import type { PostDbProperties } from './Post'
import type { Integer, Node } from 'neo4j-driver'

export interface EventDbProperties extends PostDbProperties {
  eventIsOnline: boolean
  eventLocationName: string
  eventStart: string
  eventVenue: string
}

export type Event = Node<Integer, EventDbProperties>
