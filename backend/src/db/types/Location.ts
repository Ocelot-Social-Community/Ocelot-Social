import { Integer, Node } from 'neo4j-driver'

export interface LocationDbProperties {
  id: string
  lat: number
  lng: number
  name: string
  nameDE: string
  nameEN: string
  nameES: string
  nameFR: string
  nameIT: string
  nameNL: string
  namePL: string
  namePT: string
  nameRU: string
  type: string
}

export type Location = Node<Integer, LocationDbProperties>
