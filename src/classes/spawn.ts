import { Squad, SquadType, SpawnPriority, ControllerKeeperSquad } from "classes/squad"
// import { CreepStatus } from "classes/creep"
import { Reply } from "interfaces"

declare global {
  interface StructureSpawn {
    squads: Map<string, Squad>
    rooms: Room[]

    initialize(): void
    say(message: string): void
    expand(roomnames: string[]): void
  }

  interface SpawnMemory {
    squad_names: string[]
  }
}

export function init() {
  StructureSpawn.prototype.initialize = function() {
    // memory
    if (this.memory.squad_names == null) {
      this.memory.squad_names = []
    }

    // squads
    this.squads = new Map<string, Squad>()

    for (const squad_name of this.memory.squad_names) {
      const squad = new ControllerKeeperSquad(squad_name, this.room)  // @todo: assign room
      this.squads.set(squad.name, squad)
    }

    // room
    this.rooms = []

    for (const room_name in Game.rooms) {
      const room = Game.rooms[room_name]
      this.rooms.push(room)

      if (room.keeper == null) {
        const name = ControllerKeeperSquad.generateNewName()
        const squad = new ControllerKeeperSquad(name, room)

        room.keeper = squad
        this.squads.set(squad.name, squad)
      }
    }

    // spawn
    if ((this.spawning == null) && (this.room.energyAvailable >= 50) && (this.squads.size > 0)) {
      const sorted = Array.from(this.squads.values()).sort(function(lhs, rhs) {
        const l_priority = lhs.spawnPriority
        const r_priority = rhs.spawnPriority
        if (l_priority < r_priority) return -1
        else if (l_priority > r_priority) return 1
        else return 0
      })

      const highest_priority = sorted[0].spawnPriority
      const availableEnergy = this.room.energyAvailable
      const energyCapacity = this.room.energyCapacityAvailable

      for (const squad of sorted) {
        if (squad.spawnPriority > highest_priority) {
          break
        }
        if (squad.hasEnoughEnergy(availableEnergy, this.energyCapacity) == false) {
          continue
        }
        squad.addCreep(this.spawnCreep)
      }
    }
  }

  StructureSpawn.prototype.say = function(message) {
    this.squads.forEach((squad, _) => {
      squad.say(message)
    })
  }

  StructureSpawn.prototype.expand = function(roomnames: string[]) {
    // run squads
    const sources = this.room.sources
    this.squads.forEach((squad, _) => {
      squad.upgrade(sources, this.room.controller!)
    })
  }
}
