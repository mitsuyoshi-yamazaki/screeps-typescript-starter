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
  const now = Game.time
  // if (Memory.last_tick != (now - 1)) {  // This will clear entire memory when edit Memory root
  //   if (Memory.last_tick < (now - 10)) { // Just in case
  //     console.log(`RESPAWNED now: ${now}, last tick: ${Memory.last_tick}`)
  //     console.log('CLEAR ALL MEMORY')

  //     delete Memory.spawns
  //     delete Memory.creeps
  //     delete Memory.squads
  //   }
  //   else {
  //     Memory.debug_last_tick = {
  //       last_tick: Memory.last_tick,
  //       now: now,
  //     }
  //   }
  // }
  Memory.last_tick = now

  migrateSquadMemory()

  if (Memory.squads == null) {
    Memory.squads = {}
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

function migrateSquadMemory() {
  // Memory.temp_squads = Memory.squads

  if (Memory.migrated_memory == true) {
    return
  }
  Memory.migrated_memory = true
  console.log(`STARTS MEMORY MIGRATION `)

  Memory.squads = {}

  for (const squad_memory of Memory.temp_squads) {
    Memory.squads[squad_memory.name] = squad_memory
  }

  console.log(`FINISHES MEMORY MIGRATION `)
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
