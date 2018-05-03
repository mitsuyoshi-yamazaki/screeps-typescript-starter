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

  // @fixme:
  const towers = [Game.getObjectById('5aea81a02e007b09769e059c') as StructureTower]

  for (const tower of towers) {
      // var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
      //     filter: (structure) => {
      //         return  (structure.structureType != STRUCTURE_CONTAINER) &&
      //                 (structure.hits < structure.hitsMax) && (structure.hits < 1000)
      //     }
      // });
      // if(closestDamagedStructure) {
      //     tower.repair(closestDamagedStructure);
      // }

      var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
      if(closestHostile) {
          tower.attack(closestHostile);
      }
  }
})

/**
 * @todo:
 * random move on build / upgrade
 * renew creeps
 * harvest
 */
