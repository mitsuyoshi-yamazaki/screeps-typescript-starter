import { Reply } from "interfaces"

export type CreepStatus = string
export const CreepStatus = {  // @todo: add "meta" info to status and keep it on memory, to not change objectives between ticks
  NONE    : "none",
  HARVEST : "harvest",
  UPGRADE : "upgrade",
}

declare global {
  interface Creep {
    initialize(): void

    upgrade(source: Source, target: StructureController): void
    charge(source: Source, target?: StructureController): void
  }

  interface CreepMemory {
    squad_name: string
    status: CreepStatus
    birth_time: number
  }
}

export function init() {
  Creep.prototype.initialize = function() {

  }

  Creep.prototype.upgrade = function(source: Source, target: StructureController): void {
    if (this.memory.status == CreepStatus.NONE) {
      this.memory.status = CreepStatus.HARVEST
    }

    if (this.memory.status == CreepStatus.HARVEST) {
      if (this.carry.energy == this.carryCapacity) {
        this.memory.status = CreepStatus.UPGRADE
      }
      else if (this.harvest(source) == ERR_NOT_IN_RANGE) {
        this.moveTo(source)
        return
      }
    }
    if (this.memory.status == CreepStatus.UPGRADE) {
      if (this.carry.energy == 0) {
        this.memory.status = CreepStatus.HARVEST
      }
      else if (this.upgradeController(target) == ERR_NOT_IN_RANGE) {
        this.moveTo(target)
        return
      }
    }
  }

  Creep.prototype.charge = function(source: Source, target?: StructureController): void {
    console.log(`Creep.charge() is not implemented yet`)

    // @todo: charge or upgrade
  }
}
