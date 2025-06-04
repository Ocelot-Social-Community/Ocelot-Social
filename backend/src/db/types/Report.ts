import { Integer, Node } from 'neo4j-driver'

export interface ReportDbProperties {
  closed: boolean
  createdAt: string
  id: string
  rule: string
  updatedAt: string
}

export type Report = Node<Integer, ReportDbProperties>
