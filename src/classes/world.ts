
import * as Extensions from "classes/extensions"

export function init() {
  refreshMemory()

  Extensions.init()

  for (const room_name in Game.rooms) {
    const room = Game.rooms[room_name]
    room.initialize()
  }
}

function refreshMemory() {
  // @todo: clear spawn, squad memory
  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name]
    }
  }
}
