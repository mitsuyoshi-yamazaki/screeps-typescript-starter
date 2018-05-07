import { ErrorMapper } from "utils/ErrorMapper"

import { Empire } from "classes/empire"
import * as Initializer from "classes/init"

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  Initializer.init()

  const spawns = new Map<string, StructureSpawn>()
  for (const spawnName in Game.spawns) {
    const spawn = Game.spawns[spawnName]

    spawns.set(spawnName, spawn)
  }

  const empire = new Empire("Mitsuyoshi", spawns)

  empire.run()

  for (const creep_name in Game.creeps) {
    const creep = Game.creeps[creep_name]

    if (creep.squad || creep.spawning) {
      continue
    }

    console.log(`Creep missing squad ${creep.name}, squad name: ${creep.memory.squad_name}, ${creep.memory.status}, ${creep.memory.type}`)
    // creep.suicide()
  }
})

/**
 * @fixme:
 * migrate memory
 * Spawn tries to spawn during spawning
 * carrier blocks harvester position
 */

/**
 * @todo:
 * make assertion
 * refactor harvester to room:source = 1:n
 * split worker to charger and upgrader
 * army squad: 1 ranged attack creep and renew it
 * keeper dies?
 * add current pos & room name to creep memory
 * random move on build / upgrade
 * creeps get away from attacker
 * reassign controller keeper after claiming the controller
 */

 /**
  * memo:
  * Object.keys(Game.creeps).map((n)=>{return Game.creeps[n]}).filter((c)=>{return c.memory.squad_name == 'harvester5863442'})[0]
  */
