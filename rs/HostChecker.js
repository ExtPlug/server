const miniplug = require('miniplug')

module.exports = class HostChecker {
  constructor () {
    // TODO refresh this instance sometimes if it gets disconnected or
    // something.
    this.mp = miniplug()
    this.queue = []
  }

  push ({ room, user }) {
    return new Promise((resolve, reject) => {
      this.queue.push({ room, user, resolve, reject })

      if (this.queue.length === 1) this.check()
    })
  }

  async checkRoom (room, user) {
    await this.mp.join(room)
    // The user should be in the room if they are changing the room settings.
    const userInstance = this.mp.user(user.id)
    if (!userInstance.hasPermission(miniplug.ROLE.COHOST)) {
      throw new Error('You need to be cohost or up to change the room settings.')
    }
  }

  check () {
    if (this.queue.length === 0) {
      return
    }

    const {
      room,
      user,
      resolve,
      reject
    } = this.queue.shift()

    this.checkRoom(room, user)
      .then(resolve)
      .catch(reject)
      .then(() => { this.check() })
  }
}
