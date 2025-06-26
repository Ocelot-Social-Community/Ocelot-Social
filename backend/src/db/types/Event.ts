import { Integer, Node } from 'neo4j-driver'

import { PostDbProperties } from './Post'

export interface EventDbProperties extends PostDbProperties {
  eventIsOnline: boolean
  eventLocationName: string
  eventStart: string
  eventVenue: string
}

export type Event = Node<Integer, EventDbProperties>
