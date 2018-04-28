
export function init() {
  for (const room_name in Game.rooms) {
    const room = Game.rooms[room_name]
    room.initialize()
  }
}
