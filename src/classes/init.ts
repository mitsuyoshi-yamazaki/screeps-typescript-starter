import * as Spawn from 'classes/spawn'

const keys = [
  'game',
  'empire',
  'spawn',
  'squad',
  'creep',
]

export function init() {
  keys.forEach(key => {
    if (Memory[key] == null) {
      Memory[key] = new Map<string, any>()
    }
  })

  Spawn.init()
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
