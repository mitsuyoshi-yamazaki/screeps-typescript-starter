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
  // if (Object.keys(Memory.squads).length > 100) {
  //   for (const key of Object.keys(Memory)) {
  //     console.log(`CLEAR ALL MEMORY!!!`)
  //     delete Memory[key]
  //   }
  // }

  const now = Game.time
  if (Memory.last_tick != (now - 1)) {
    if (Memory.last_tick < (now - 10)) { // Just in case
      console.log(`RESPAWNED now: ${now}, last tick: ${Memory.last_tick}`)
      console.log('CLEAR ALL MEMORY')

      delete Memory.spawns
      delete Memory.creeps
      delete Memory.squads
    }
    else {
      Memory.debug_last_tick = {
        last_tick: Memory.last_tick,
        now: now,
      }
    }
  }
  Memory.last_tick = now

  if (Memory.squads == null) {
    Memory.squads = []
  }

  if (Memory.rooms == null) {
    Memory.rooms = {}
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
