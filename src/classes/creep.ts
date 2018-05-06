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

export enum ActionResult {
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
  HEALER            = 'healer',
  SCOUT             = 'scout',
}

declare global {
  interface Creep {
    squad: Squad
    initialize(): void

    // General tasks
    moveToRoom(destination_room_name: string): ActionResult
    goToRenew(spawn: StructureSpawn): ActionResult

    // Worker tasks
    harvestFrom(source: Source): ActionResult
    work(room: Room, source?: StructureContainer | StructureStorage): void
    buildTo(source: Source, target: ConstructionSite): ActionResult
    repairTo(source: Source, target: Structure, max_hits?: number): ActionResult
    upgrade(source: Source, target: StructureController): void

    // Controller tasks
    claim(target_room_name: string): ActionResult
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
  Creep.prototype.moveToRoom = function(destination_room_name: string): ActionResult {
    if (this.room.name == destination_room_name) {
      if (this.pos.x == 0) {
        if (this.move(RIGHT) == OK) {
          return ActionResult.IN_PROGRESS
        }
      }
      if (this.pos.x == 49) {
        if (this.move(LEFT) == OK) {
          return ActionResult.IN_PROGRESS
        }
      }
      if (this.pos.y == 0) {
        if (this.move(BOTTOM) == OK) {
          return ActionResult.IN_PROGRESS
        }
      }
      if (this.pos.y == 49) {
        if (this.move(TOP) == OK) {
          return ActionResult.IN_PROGRESS
        }
      }
      return ActionResult.DONE
    }

    if ((destination_room_name == 'W44S42') && (Number(this.room.name.slice(4,6)) > 43)) {
      destination_room_name = 'W46S43'  // @fixme: this is waypoint
    }

    const exit = this.room.findExitTo(destination_room_name) as FindConstant
    if (exit < 0) {
      console.log(`Creep.moveToRoom ${destination_room_name} can't find exit ${exit}`)
      return ActionResult.IN_PROGRESS
    }

    const closest_exit = this.pos.findClosestByPath(exit)

    this.moveTo(closest_exit)
    return ActionResult.IN_PROGRESS
  }

  Creep.prototype.goToRenew = function(spawn: StructureSpawn): ActionResult {
    if ((this.ticksToLive || 0) >= 1400) {
      this.memory.status = CreepStatus.NONE
      return ActionResult.DONE
    }

    this.memory.status = CreepStatus.WAITING_FOR_RENEW
    this.moveTo(spawn)
    this.transfer(spawn, RESOURCE_ENERGY)

    return ActionResult.IN_PROGRESS
  }


  // --- Worker tasks ---
  Creep.prototype.harvestFrom = function(source: Source): ActionResult {
    this.memory.status = CreepStatus.HARVEST

    if (this.carry.energy == this.carryCapacity) {
      this.memory.status = CreepStatus.NONE
      return ActionResult.DONE
    }
    if (this.harvest(source) == ERR_NOT_IN_RANGE) {
      this.moveTo(source)
    }

    return ActionResult.IN_PROGRESS
  }

  Creep.prototype.buildTo = function(source: Source, target: ConstructionSite): ActionResult {
    if (!target) {
      console.log(`Creep.repairTo no target specified ${this.name}`)
      return ActionResult.IN_PROGRESS
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
        return ActionResult.IN_PROGRESS
      }
    }

    // Build
    if (this.memory.status == CreepStatus.BUILD) {
      if (!target) {
        this.memory.status = CreepStatus.NONE
        return ActionResult.DONE
      }
      else if (this.carry.energy == 0) {
        this.memory.status = CreepStatus.HARVEST
      }
      else if (this.build(target) == ERR_NOT_IN_RANGE) {
        this.moveTo(target)
        return ActionResult.IN_PROGRESS
      }
    }

    return ActionResult.IN_PROGRESS
  }

  Creep.prototype.repairTo = function(source: Source, target: Structure, max_hits?: number): ActionResult {
    if (!target) {
      console.log(`Creep.repairTo no target specified ${this.name}`)
      return ActionResult.IN_PROGRESS
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
        return ActionResult.IN_PROGRESS
      }
    }

    // Repair
    if (this.memory.status == CreepStatus.REPAIR) {
      if (target.hits >= (max_hits || target.hitsMax)) {
        this.memory.status = CreepStatus.NONE
        return ActionResult.DONE
      }
      if (this.repair(target) == ERR_NOT_IN_RANGE) {
        this.moveTo(target)
        return ActionResult.IN_PROGRESS
      }
    }

    return ActionResult.IN_PROGRESS
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

  // --- Work ---
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

        if (this.room.name == 'W48S47') { // @fixme: temp code
          let number = 0

          for (const creep_name in Game.creeps) {
            const creep = Game.creeps[creep_name]

            if ((creep.room.name == 'W48S47') && (creep.memory.type == CreepType.WORKER) && (creep.memory.status == CreepStatus.CHARGE)) {
              number = number + 1
            }
          }

          if (number > 3) {
            this.memory.status = CreepStatus.UPGRADE
          }
        }
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
          if (this.room.name == 'W44S42') { // @fixme: temp code
            const target = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE)

            if (target) {
              if (this.harvest(target) == ERR_NOT_IN_RANGE) {
                this.moveTo(target)
                return
              }
            }
            else if (source && (source.room.name == this.room.name) && (source.store.energy > 0)) {
              if (this.withdraw(source!, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                this.moveTo(source!)
                return
              }
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
              const target = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE)

              if (this.harvest(target) == ERR_NOT_IN_RANGE) {
                this.moveTo(target)
                return
              }
            }
          }
        }
      }
    }

    // Charge
    if ((this.memory.status == CreepStatus.CHARGE) || (this.memory.status == CreepStatus.BUILD)) {  // To check energy needed structure every tick
      const target = this.pos.findClosestByPath(FIND_MY_STRUCTURES, {
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
      const target = this.pos.findClosestByPath(FIND_CONSTRUCTION_SITES, {
        filter: (site) => site.my
      })

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

  Creep.prototype.claim = function(target_room_name: string): ActionResult {
    this.say('CLAIM')

    if (this.body.map(part => part.type).indexOf(CLAIM) == -1) {
      console.log(`Creep.claim doesn't have CLAIM body part ${this.body.map(part => part.type)}, ${this.name}`)
      return ActionResult.IN_PROGRESS
    }

    const room = Game.rooms[target_room_name]
    if (!room) {
      this.say(target_room_name)
      this.moveToRoom(target_room_name)
      return ActionResult.IN_PROGRESS
    }

    const target = room.controller!
    if (target.my) {
      this.say('MY ROOM')
      return ActionResult.DONE
    }

    let result: number
    let action: string
    const room_name_to_claim = 'W44S42'

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
        return ActionResult.IN_PROGRESS

      case ERR_NOT_IN_RANGE:
        this.moveTo(target)
        return ActionResult.IN_PROGRESS

      default:
        if ((result == ERR_INVALID_TARGET) && (action == 'claimController')) {
        }
        else {
          console.log(`Creep.claim ${action} Unexpected return code ${result}, ${this.name}`)
        }
        break
    }

    return ActionResult.IN_PROGRESS
  }
}
