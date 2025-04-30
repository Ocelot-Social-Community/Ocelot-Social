import { Integer, Node } from 'neo4j-driver'

export interface UserDbProperties {
  allowEmbedIframes: boolean
  awaySince?: string
  createdAt: string
  deleted: boolean
  disabled: boolean
  emailNotificationsChatMessage?: boolean
  emailNotificationsCommentOnObservedPost?: boolean
  emailNotificationsFollowingUsers?: boolean
  emailNotificationsGroupMemberJoined?: boolean
  emailNotificationsGroupMemberLeft?: boolean
  emailNotificationsGroupMemberRemoved?: boolean
  emailNotificationsGroupMemberRoleChanged?: boolean
  emailNotificationsMention?: boolean
  emailNotificationsPostInGroup?: boolean
  encryptedPassword: string
  id: string
  lastActiveAt?: string
  lastOnlineStatus?: string
  locale: string
  name: string
  role: string
  showShoutsPublicly: boolean
  slug: string
  termsAndConditionsAgreedAt: string
  termsAndConditionsAgreedVersion: string
  updatedAt: string
}

export type User = Node<Integer, UserDbProperties>
