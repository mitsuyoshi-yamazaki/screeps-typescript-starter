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

  empire.expand(["W5N3"])

  for (const creep_name in Game.creeps) {
    const creep = Game.creeps[creep_name]

    if (creep.squad || creep.spawning) {
      continue
    }

    console.log(`Creep missing squad ${creep.name}, squad name: ${creep.memory.squad_name}, ${creep.memory.status}, ${creep.memory.type}`)
  }
})

/**
 * @todo:
 * display status on game
 * random move on build / upgrade
 * army squad: 1 ranged attack creep and renew it
 */
