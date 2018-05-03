
export enum CreepStatus {  // @todo: add "meta" info to status and keep it on memory, to not change objectives between ticks
  NONE    = "none",
  HARVEST = "harvest",
  CHARGE  = "charge",
  BUILD   = "build",
  REPAIR  = "repair",
  UPGRADE = "upgrade",
}

export enum CreepActionResult {
  IN_PROGRESS = "in_progress",
  DONE        = "done",
}

declare global {
  interface Creep {
    initialize(): void

    // General tasks
    moveToRoom(destination_room_name: string): CreepActionResult

    // Worker tasks
    harvestFrom(source: Source): CreepActionResult
    charge(source: Source, room: Room): void
    buildTo(source: Source, target: ConstructionSite): CreepActionResult
    repairTo(source: Source, target: Structure, max_hits?: number): CreepActionResult
    upgrade(source: Source, target: StructureController): void

    // Controller tasks
    claim(target_room_name: string): CreepActionResult
  }

  interface CreepMemory {
    squad_name: string
    status: CreepStatus
    birth_time: number
    manual_state?: number  // only for ManualSquad
  }
}

export function init() {
  Creep.prototype.initialize = function() {
    if ((this.memory.status == null) || (this.memory.status == undefined)) {
      this.memory.status = CreepStatus.NONE
    }
  }

  Creep.prototype.harvestFrom = function(source: Source): CreepActionResult {
    this.memory.status = CreepStatus.HARVEST

    if (this.carry.energy == this.carryCapacity) {
      this.memory.status = CreepStatus.NONE
      return CreepActionResult.DONE
    }
    if (this.harvest(source) == ERR_NOT_IN_RANGE) {
      this.moveTo(source)
    }

    return CreepActionResult.IN_PROGRESS
  }

  Creep.prototype.buildTo = function(source: Source, target: ConstructionSite): CreepActionResult {
    if (!target) {
      console.log(`Creep.repairTo no target specified ${this.name}`)
      return CreepActionResult.IN_PROGRESS
    }

    if ((this.memory.status == CreepStatus.NONE) || (this.carry.energy == 0)) {
      this.memory.status = CreepStatus.HARVEST
    }

    // Harvest
    if (this.memory.status == CreepStatus.HARVEST) {
      if (this.carry.energy == this.carryCapacity) {
        this.memory.status = CreepStatus.BUILD
      }
      else if (this.harvest(source) == ERR_NOT_IN_RANGE) {
        this.moveTo(source)
        return CreepActionResult.IN_PROGRESS
      }
    }

    // Build
    if (this.memory.status == CreepStatus.BUILD) {
      if (!target) {
        this.memory.status = CreepStatus.NONE
        return CreepActionResult.DONE
      }
      else if (this.carry.energy == 0) {
        this.memory.status = CreepStatus.HARVEST
      }
      else if (this.build(target) == ERR_NOT_IN_RANGE) {
        this.moveTo(target)
        return CreepActionResult.IN_PROGRESS
      }
    }

    return CreepActionResult.IN_PROGRESS
  }

  Creep.prototype.repairTo = function(source: Source, target: Structure, max_hits?: number): CreepActionResult {
    if (!target) {
      console.log(`Creep.repairTo no target specified ${this.name}`)
      return CreepActionResult.IN_PROGRESS
    }

    if ((this.memory.status == CreepStatus.NONE) || (this.carry.energy == 0)) {
      this.memory.status = CreepStatus.HARVEST
    }

    // Harvest
    if (this.memory.status == CreepStatus.HARVEST) {
      if (this.carry.energy == this.carryCapacity) {
        this.memory.status = CreepStatus.REPAIR
      }
      else if (this.harvest(source) == ERR_NOT_IN_RANGE) {
        this.moveTo(source)
        return CreepActionResult.IN_PROGRESS
      }
    }

    // Repair
    if (this.memory.status == CreepStatus.REPAIR) {
      if (target.hits >= (max_hits || target.hitsMax)) {
        this.memory.status = CreepStatus.NONE
        return CreepActionResult.DONE
      }
      if (this.repair(target) == ERR_NOT_IN_RANGE) {
        this.moveTo(target)
        return CreepActionResult.IN_PROGRESS
      }
    }

    return CreepActionResult.IN_PROGRESS
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

    // Build
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

  Creep.prototype.moveToRoom = function(destination_room_name: string): CreepActionResult { // pos?: {x: number, y: number}
    if (this.room.name == destination_room_name) {
      return CreepActionResult.DONE

      // if ((this.pos.x == pos.x) && (this.pos.y == pos.y)) { // If pos is a object's position, the user of this function should take care of it
      //   return CreepActionResult.DONE
      // }

      // // @todo: make pos to optional, and default pos to room controller
      // console.log('[Creep] moveToRoom same room ', destination_room_name, this.room.name)
      // this.moveTo(pos.x, pos.y)
      // return CreepActionResult.IN_PROGRESS
    }

    const exit = this.room.findExitTo(destination_room_name) as FindConstant
    if (exit < 0) {
      console.log(`Creep.moveToRoom ${destination_room_name} can't find exit ${exit}`)
      return CreepActionResult.IN_PROGRESS
    }

    const closest_exit = this.pos.findClosestByPath(exit)

    this.moveTo(closest_exit)
    return CreepActionResult.IN_PROGRESS
  }

  Creep.prototype.claim = function(target_room_name: string): CreepActionResult {
    if (this.body.map(part => part.type).indexOf(CLAIM) == -1) {
      console.log(`Creep.claim doesn't have CLAIM body part ${this.body.map(part => part.type)}, ${this.name}`)
      return CreepActionResult.IN_PROGRESS
    }

    const room = Game.rooms[target_room_name]
    if (!room) {
      this.moveToRoom(target_room_name)
      return CreepActionResult.IN_PROGRESS
    }

    const target = room.controller!
    if (target.my) {
      return CreepActionResult.DONE
    }

    let result: number
    let action: string

    if (target.owner && target.owner.username) {
      action = 'attackController'
      result = this.attackController(target)
    }
    else {
      action = 'claimController'
      result = this.claimController(target)
    }

    switch (result) {
      case OK:
      case ERR_TIRED:
        return CreepActionResult.IN_PROGRESS

      case ERR_NOT_IN_RANGE:
        this.moveTo(target)
        return CreepActionResult.IN_PROGRESS

      default:
        console.log(`Creep.claim ${action} Unexpected return code ${result}, ${this.name}`)
        break
    }

    return CreepActionResult.IN_PROGRESS
  }
}
