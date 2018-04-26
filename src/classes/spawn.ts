import { ActionResult, GroupActionType } from 'interfaces'

declare global {
  interface StructureSpawn extends GroupActionType {
    creeps: Map<string, Creep>

    initialize(): void
  }
}

export function init() {
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
}
