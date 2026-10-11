// Rooms whose participant count the API has handed to a client on request.
//
// The poller only publishes the changes it notices itself, between one poll and the next. A
// client can be told a count the poller never saw — it asks while a participant is in a room
// that is gone again before the next poll (a short call, or simply someone hanging up right
// after the page was loaded). Nothing would ever correct that client: from the poller's point
// of view the room went from "not there" to "not there". So what was told is noted here, and
// the next poll publishes the truth for those rooms whether it saw a change or not.
//
// Only running calls are noted. A client told 0 needs no correction: a room that fills up
// afterwards is a change the poller does see.
const toldRooms = new Set<string>()

export const markRoomTold = (roomName: string): void => {
  toldRooms.add(roomName)
}

export const noteCountTold = (roomName: string, count: number): void => {
  if (count > 0) {
    markRoomTold(roomName)
  }
}

// Hands the noted rooms over and starts afresh.
export const takeToldRooms = (): Set<string> => {
  const taken = new Set(toldRooms)
  toldRooms.clear()
  return taken
}
