export const isUserOnline = (user) => {
  // Is Recipient considered online
  const lastActive = new Date(user.lastActiveAt).getTime()
  const awaySince = new Date(user.awaySince).getTime()
  const now = new Date().getTime()
  const status = user.lastOnlineStatus
  if (
    // online & last active less than 1.5min -> online
    (status === 'online' && now - lastActive < 90000) ||
    // away for less then 3min -> online
    (status === 'away' && now - awaySince < 180000)
  ) {
    return true
  }
  return false
}
