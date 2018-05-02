import { Reply } from "interfaces"

export enum CreepStatus {  // @todo: add "meta" info to status and keep it on memory, to not change objectives between ticks
  NONE    = "none",
  HARVEST = "harvest",
  CHARGE  = "charge",
  BUILD   = "build",
  UPGRADE = "upgrade",
}

declare global {
  interface Creep {
    initialize(): void

    upgrade(source: Source, target: StructureController): void
    charge(source: Source, room: Room): void
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
    if ((this.memory.status == CreepStatus.NONE) || (this.carry.energy == 0)) {
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

  Creep.prototype.charge = function(source: Source, room: Room): void {
    if ((this.memory.status == CreepStatus.NONE) || (this.carry.energy == 0)) {
      this.memory.status = CreepStatus.HARVEST
    }

    // Harvest
    if (this.memory.status == CreepStatus.HARVEST) {
      if (this.carry.energy == this.carryCapacity) {
        this.memory.status = CreepStatus.CHARGE
      }
      else if (this.harvest(source) == ERR_NOT_IN_RANGE) {
        this.moveTo(source)
        return
      }
    }

    // Charge
    if (this.memory.status == CreepStatus.CHARGE) {
      const target = this.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: structure => {
          return (structure.structureType == STRUCTURE_EXTENSION ||
            structure.structureType == STRUCTURE_SPAWN ||
            structure.structureType == STRUCTURE_TOWER
            ) && structure.energy < structure.energyCapacity
        }
      })

      if (!target) {
        this.memory.status = CreepStatus.BUILD
      }
      else if (this.carry.energy == 0) {
        this.memory.status = CreepStatus.HARVEST
      }
      else if (this.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        this.moveTo(target)
        return
      }
    }

    if (this.memory.status == CreepStatus.BUILD) {
      const target = this.pos.findClosestByPath(FIND_CONSTRUCTION_SITES)

      if (!target) {
        this.memory.status = CreepStatus.UPGRADE
      }
      else if (this.carry.energy == 0) {
        this.memory.status = CreepStatus.HARVEST
      }
      else if (this.build(target) == ERR_NOT_IN_RANGE) {
        this.moveTo(target)
        return
      }
    }

    // Upgrade
    if (this.memory.status == CreepStatus.UPGRADE) {
      if (this.carry.energy == 0) {
        this.memory.status = CreepStatus.HARVEST
      }
      else if (this.upgradeController(room.controller!) == ERR_NOT_IN_RANGE) {
        this.moveTo(room.controller!)
        return
      }
    }
  }
}
