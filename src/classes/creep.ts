import { Squad } from "classes/squad/squad"

export enum CreepStatus {  // @todo: add "meta" info to status and keep it on memory, to not change objectives between ticks
  NONE    = "none",
  HARVEST = "harvest",
  CHARGE  = "charge",
  BUILD   = "build",
  REPAIR  = "repair",
  UPGRADE = "upgrade",
  WAITING_FOR_RENEW = "waiting_for_renew",
}

export enum CreepActionResult {
  IN_PROGRESS = "in_progress",
  DONE        = "done",
}

export enum CreepType {
  CLAIMER           = 'claimer',
  WORKER            = 'worker',
  CONTROLLER_KEEPER = 'controller_keeper',
  HARVESTER         = 'harvester',
  CARRIER           = 'carrier',
  ATTACKER          = 'attacker',
  SCOUT             = 'scout',
}

declare global {
  interface Creep {
    squad: Squad
    initialize(): void

    // General tasks
    moveToRoom(destination_room_name: string): CreepActionResult
    goToRenew(spawn: StructureSpawn): CreepActionResult

    // Worker tasks
    harvestFrom(source: Source): CreepActionResult
    work(room: Room, source?: StructureContainer | StructureStorage): void
    buildTo(source: Source, target: ConstructionSite): CreepActionResult
    repairTo(source: Source, target: Structure, max_hits?: number): CreepActionResult
    upgrade(source: Source, target: StructureController): void

    // Controller tasks
    claim(target_room_name: string): CreepActionResult
  }

  interface CreepMemory {
    squad_name: string
    status: CreepStatus
    type: CreepType
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

  // --- General tasks ---
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

  Creep.prototype.goToRenew = function(spawn: StructureSpawn): CreepActionResult {
    if ((this.ticksToLive || 0) >= 1400) {
      this.memory.status = CreepStatus.NONE
      return CreepActionResult.DONE
    }

    this.memory.status = CreepStatus.WAITING_FOR_RENEW
    this.moveTo(spawn)
    this.transfer(spawn, RESOURCE_ENERGY)

    return CreepActionResult.IN_PROGRESS
  }


  // --- Worker tasks ---
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

  // Work
  Creep.prototype.work = function(room: Room, source?: StructureContainer | StructureStorage): void {
    if (!room) {
      console.log(`Creep.work room not specified ${this.name}`)
    }

    if ((this.memory.status == CreepStatus.NONE) || (this.carry.energy == 0)) {
      this.memory.status = CreepStatus.HARVEST
    }

    // Harvest
    if (this.memory.status == CreepStatus.HARVEST) {
      if (this.carry.energy == this.carryCapacity) {
        this.memory.status = CreepStatus.CHARGE
      }
      else {
        const drop = this.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
          filter: function(resource: Resource) {
            return (resource.resourceType == RESOURCE_ENERGY) && (resource.amount >= 20)
          }
        }) as Resource
        if (drop) {
          if (this.pickup(drop) == ERR_NOT_IN_RANGE) {
            this.moveTo(drop)
            return
          }
        }
        else {
          if (source && (source.room.name == this.room.name) && (source.store.energy > 0)) {
            if (this.withdraw(source!, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
              this.moveTo(source!)
              return
            }
          }
          else {
            const source = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE)

            if (this.harvest(source) == ERR_NOT_IN_RANGE) {
              this.moveTo(source)
              return
            }
          }
        }
      }
    }

    // Charge
    if ((this.memory.status == CreepStatus.CHARGE) || (this.memory.status == CreepStatus.BUILD)) {  // To check energy needed structure every tick
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

  Creep.prototype.claim = function(target_room_name: string): CreepActionResult {
    this.say('CLAIM')

    if (this.body.map(part => part.type).indexOf(CLAIM) == -1) {
      console.log(`Creep.claim doesn't have CLAIM body part ${this.body.map(part => part.type)}, ${this.name}`)
      return CreepActionResult.IN_PROGRESS
    }

    const room = Game.rooms[target_room_name]
    if (!room) {
      if ((target_room_name == 'W44S42') && (Number(this.room.name.slice(4,6)) > 43)) {
        const waypoint = 'W46S43'
        this.say(waypoint)
        this.moveToRoom(waypoint)
      }
      else {
        this.say(target_room_name)
        this.moveToRoom(target_room_name)
      }
      return CreepActionResult.IN_PROGRESS
    }

    const target = room.controller!
    if (target.my) {
      this.say('MY ROOM')
      return CreepActionResult.DONE
    }

    let result: number
    let action: string
    const room_name_to_claim = 'W49S47'

    if ((target.owner && target.owner.username) && (target.ticksToDowngrade > 1000)) {
      action = 'attackController'
      result = this.attackController(target)
    }
    else if (target_room_name == room_name_to_claim) {
      action = 'claimController'
      result = this.claimController(target)
    }
    else {
      action = 'reserveController'
      result = this.reserveController(target)
    }
    this.say(action)

    switch (result) {
      case OK:
      case ERR_BUSY:
      case ERR_TIRED:
        return CreepActionResult.IN_PROGRESS

      case ERR_NOT_IN_RANGE:
        this.moveTo(target)
        return CreepActionResult.IN_PROGRESS

      default:
        if ((result == ERR_INVALID_TARGET) && (action == 'claimController')) {
        }
        else {
          console.log(`Creep.claim ${action} Unexpected return code ${result}, ${this.name}`)
        }
        break
    }

    return CreepActionResult.IN_PROGRESS
  }
}
