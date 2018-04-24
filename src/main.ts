import { ErrorMapper } from "utils/ErrorMapper";

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
});

enum ActionResult {
  OK = 'ok'
}

interface GroupActionType {
  say(message: string): ActionResult
  expand(roomnames: string[]): ActionResult
}

class Empire implements GroupActionType {
  constructor(readonly spawns: Map<string, StructureSpawn>) {
  }

  say(message: string): ActionResult {
    let results: ActionResult[] = []

    this.spawns.forEach((spawn, spawnID) => {
      results.push(spawn.say(message))
    })

    return ActionResult.OK
  }

  expand(roomnames: string[]): ActionResult {
    console.log('Empire.expand() not implemented yet')
    return ActionResult.OK
  }
}

declare global {
  interface StructureSpawn extends GroupActionType {
    creeps: {[index: string]: Creep}

    initialize(): void
  }
}

StructureSpawn.prototype.initialize = function() {
  this.creeps = {}

  for (const creepName in Game.creeps) {
    const creep = Game.creeps[creepName]

    this.creeps[creep.id] = creep
  }
}

StructureSpawn.prototype.say = function(message) {
  for (const creepID in this.creeps) {
    const creep = this.creeps[creepID]

    creep.say(message)
  }

  return ActionResult.OK
}

StructureSpawn.prototype.expand = function(roomnames: string[]) {
  console.log('StructureSpawn.expand() not implemented yet')
  return ActionResult.OK
}
