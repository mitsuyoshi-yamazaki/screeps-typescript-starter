import { CreepStatus, ActionResult } from "./creep";

declare global {
  interface StructureSpawn {
    initialize(): void
    renewSurroundingCreeps(): ActionResult
  }
}

export function init() {
  StructureSpawn.prototype.initialize = function() {
    this.room.spawns.push(this)
  }

  StructureSpawn.prototype.renewSurroundingCreeps = function(): ActionResult {
    const creeps_need_renew = this.pos.findInRange(FIND_MY_CREEPS, 1, {
      filter: (creep: Creep) => {
        return creep.memory.status == CreepStatus.WAITING_FOR_RENEW
      }
    }) as Creep[]

    creeps_need_renew.forEach((creep) => {
      this.renewCreep(creep)
    })

    return creeps_need_renew.length == 0 ? ActionResult.DONE : ActionResult.IN_PROGRESS
  }
}
