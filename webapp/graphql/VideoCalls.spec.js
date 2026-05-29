import {
  videoCallConfigQuery,
  videoCallParticipantCountQuery,
  joinGroupVideoCallMutation,
  videoCallParticipantCountChangedSubscription,
} from './VideoCalls'

const printOp = (doc) => doc.loc.source.body.replace(/\s+/g, ' ').trim()

describe('VideoCalls graphql documents', () => {
  it('builds the videoCallConfig query', () => {
    expect(printOp(videoCallConfigQuery())).toBe('query { videoCallConfig { enabled } }')
  })

  it('builds the videoCallParticipantCount query', () => {
    expect(printOp(videoCallParticipantCountQuery())).toBe(
      'query ($groupId: ID!) { videoCallParticipantCount(groupId: $groupId) }',
    )
  })

  it('builds the joinGroupVideoCall mutation', () => {
    expect(printOp(joinGroupVideoCallMutation())).toBe(
      'mutation ($groupId: ID!) { joinGroupVideoCall(groupId: $groupId) { token url roomName } }',
    )
  })

  it('builds the videoCallParticipantCountChanged subscription', () => {
    expect(printOp(videoCallParticipantCountChangedSubscription())).toBe(
      'subscription ($groupId: ID!) { videoCallParticipantCountChanged(groupId: $groupId) { groupId count } }',
    )
  })
})
