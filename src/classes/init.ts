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
  Game.version = '2.16.6'
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

  if (!Memory.versions) {
    Memory.versions = []
  }
  if (Memory.versions.indexOf(Game.version) < 0) {
    Memory.versions.push(Game.version)
    console.log(`Updated v${Game.version}`)
  }

  if (Memory.squads == null) {
    Memory.squads = {}
  }

  if (Memory.rooms == null) {
    Memory.rooms = {}
  }

  if (!Memory.regions) {
    Memory.regions = {}
  }

  if (!Memory.debug) {
    Memory.debug = {
      show_visuals: false,
      test_send_resources: false,
      show_cpu_usage: false,
    }
  }
  if ((Game.time % 997) == 0) {
    Memory.debug.show_visuals = false
  }

  if (!Memory.cpu_usages) {
    Memory.cpu_usages = []
  }

  const cpu_ticks = 20
  if (Memory.cpu_usages.length > cpu_ticks) {
    Memory.cpu_usages.shift()
  }

  if (Memory.trading == null) {
    Memory.trading = {
      stop: true
    }
  }

  if (true) {
    if ((Game.time % cpu_ticks) == 0) {
      console.log(`CPU usage: ${Memory.cpu_usages}, ave: ${_.sum(Memory.cpu_usages) / cpu_ticks}, bucket: ${Game.cpu.bucket}`)
    }
  }

  keys.forEach((key) => {
    if (Memory[key] == null) {
      Memory[key] = new Map<string, any>()
    }
  })

  WorldInitializer.init()
  SpawnInitializer.init()
  CreepInitializer.init()

  Game.reactions = {}

  for (const resource_type of Object.keys(REACTIONS)) {
    const reactions = REACTIONS[resource_type]

    for (const ingredient_type of Object.keys(reactions)) {
      const compound_type = reactions[ingredient_type]
      Game.reactions[compound_type] = {
        lhs: resource_type as ResourceConstant,
        rhs: ingredient_type as ResourceConstant,
      }
    }
  }

  // if ((Game.time % 13) == 5) {
  //   console.log(Object.keys(Game.reactions))

  //   for (const rt of Object.keys(Game.reactions)) {
  //     const aa = Game.reactions[rt]
  //     console.log(`${rt}: ${aa.lhs}, ${aa.rhs}`)
  //   }
  // }
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
