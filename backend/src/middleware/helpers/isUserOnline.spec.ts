import { isUserOnline } from './isUserOnline'

let user

describe('isUserOnline', () => {
  beforeEach(() => {
    user = {
      lastActiveAt: null,
      awaySince: null,
      lastOnlineStatus: null,
    }
  })
  describe('user has lastOnlineStatus `online`', () => {
    it('returns true if he was active within the last 90 seconds', () => {
      user.properties.lastOnlineStatus = 'online'
      user.properties.lastActiveAt = new Date()
      expect(isUserOnline(user)).toBe(true)
    })
    it('returns false if he was not active within the last 90 seconds', () => {
      user.properties.lastOnlineStatus = 'online'
      user.properties.lastActiveAt = new Date().getTime() - 90001
      expect(isUserOnline(user)).toBe(false)
    })
  })

  describe('user has lastOnlineStatus `away`', () => {
    it('returns true if he went away less then 180 seconds ago', () => {
      user.properties.lastOnlineStatus = 'away'
      user.properties.awaySince = new Date()
      expect(isUserOnline(user)).toBe(true)
    })
    it('returns false if he went away more then 180 seconds ago', () => {
      user.properties.lastOnlineStatus = 'away'
      user.properties.awaySince = new Date().getTime() - 180001
      expect(isUserOnline(user)).toBe(false)
    })
  })

  describe('user is freshly created and has never logged in', () => {
    it('returns false', () => {
      expect(isUserOnline(user)).toBe(false)
    })
  })
})
