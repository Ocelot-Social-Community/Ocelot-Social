import { beforeEach, describe, expect, it } from 'vitest'

import { markRoomTold, noteCountTold, takeToldRooms } from './toldRooms'

beforeEach(() => {
  takeToldRooms()
})

describe('toldRooms', () => {
  it('notes a room a client was told a running call for', () => {
    noteCountTold('group-a', 2)
    noteCountTold('group-a', 1)
    noteCountTold('group-b', 1)

    expect([...takeToldRooms()].sort()).toEqual(['group-a', 'group-b'])
  })

  it('does not note a room without participants', () => {
    noteCountTold('group-a', 0)

    expect(takeToldRooms().size).toBe(0)
  })

  it('hands the rooms over once and starts afresh', () => {
    markRoomTold('group-a')

    expect(takeToldRooms()).toEqual(new Set(['group-a']))
    expect(takeToldRooms().size).toBe(0)
  })

  it('keeps what was taken apart from what is noted afterwards', () => {
    markRoomTold('group-a')
    const taken = takeToldRooms()
    markRoomTold('group-b')

    expect(taken).toEqual(new Set(['group-a']))
  })
})
