import * as Extensions from "classes/extensions"
import * as CreepInitializer from "classes/creep"
import * as SpawnInitializer from "classes/spawn"

export function init(): void {
  Game.version = '2.17.2'
  const now = Game.time

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
      cpu: {
        show_usage: false,
        threshold: 0,
        stop_threshold: 150,
      }
    }
  }

  if (!Memory.cpu_usages) {
    Memory.cpu_usages = []
  }

  if (Memory.trading == null) {
    Memory.trading = {
      stop: true
    }
  }

  Extensions.init()
}

export function tick(): void {
  const time = Game.time

  if ((time % 997) == 0) {
    Memory.debug.show_visuals = false
  }

  const cpu_ticks = 20
  if (Memory.cpu_usages.length > cpu_ticks) {
    Memory.cpu_usages.shift()
  }

  if ((Game.time % cpu_ticks) == 0) {
    console.log(`CPU usage: ${Memory.cpu_usages}, ave: ${_.sum(Memory.cpu_usages) / cpu_ticks}, bucket: ${Game.cpu.bucket}`)
  }

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

  Extensions.tick()
  refreshMemory()

  for (const room_name in Game.rooms) {
    const room = Game.rooms[room_name]
    room.initialize()
  }

  // Followings set functions to prototype, and the prototypes are reset every tick
  SpawnInitializer.init()
  CreepInitializer.init()

  Game.squad_creeps = {}

  for (const creep_name in Game.creeps) {
    const creep = Game.creeps[creep_name]
    const squad_name = creep.memory.squad_name

    if (!squad_name) {
      continue
    }

    if (!Game.squad_creeps[squad_name]) {
      Game.squad_creeps[squad_name] = []
    }

    Game.squad_creeps[squad_name].push(creep)
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
