import * as WorldInitializer from "classes/world"
import * as CreepInitializer from "classes/creep"
import * as SpawnInitializer from "classes/spawn"

const keys = [
  "game",
  "empire",
  "spawn",
  "squad",
  "creep"
]

export function init() {
  if (_.size(Game.creeps) == 0 && _.size(Game.rooms) == 1 && !Memory.respawncomplete ) {
    const room = _.find(Game.rooms)!
    if ( room.controller!.level == 1 ) {
      console.log('CLEAR ALL MEMORY')

      delete Memory.spawns
      delete Memory.creeps
      delete Memory.squads

      Memory.respawncomplete = true
    }
    else {
      Memory.respawncomplete = false
    }
  }
  else {
    Memory.respawncomplete = false
  }

  if (Memory.squads == null) {
    Memory.squads = []
  }

  keys.forEach((key) => {
    if (Memory[key] == null) {
      Memory[key] = new Map<string, any>()
    }
  })

  WorldInitializer.init()
  SpawnInitializer.init()
  CreepInitializer.init()
}

/**
 * Memory structure
 * root
 * |- game
 * |- empire
 * |- spawn(StructureSpawn.memory)
 * |  |- squad_names
 * |- squads
 * |  |- squad_name
 * |- creep(Creep.memory)
 *    |- squad_name
 */
