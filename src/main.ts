import { ErrorMapper } from "utils/ErrorMapper";
import { ActionResult, GroupActionType } from 'interfaces'
import { Empire } from 'classes/empire'

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  let spawns = new Map<string, StructureSpawn>()
  for (const spawnName in Game.spawns) {
    const spawn = Game.spawns[spawnName]

    spawns.set(spawnName, spawn)
  }

  const empire = new Empire('Mitsuyoshi', spawns)

  empire.say('Hello')
});

declare global {
  export interface StructureSpawn extends GroupActionType {
    creeps: Map<string, Creep>

    initialize(): void
  }
}

StructureSpawn.prototype.initialize = function() {
  this.creeps = new Map<string, Creep>()

  for (const creepName in Game.creeps) {
    const creep = Game.creeps[creepName]

    this.creeps.set(creep.id, creep)
  }
}

StructureSpawn.prototype.say = function(message) {
  this.creeps.forEach((creep, _) => {
    creep.say(message)
  })

  return ActionResult.OK
}

StructureSpawn.prototype.expand = function(roomnames: string[]) {
  console.log('StructureSpawn.expand() not implemented yet')
  return ActionResult.OK
}
