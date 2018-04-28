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
 * |  |- squad_ids
 * |- squad
 * |- creep(Creep.memory)
 *    |- squad_id
 */
