import { StructureFilter } from "./utils"
import { Squad } from "classes/squad/squad"

export enum CreepStatus {  // @todo: add "meta" info to status and keep it on memory, to not change objectives between ticks
  NONE    = "none",
  HARVEST = "harvest",
  CHARGE  = "charge",
  BUILD   = "build",
  REPAIR  = "repair",
  UPGRADE = "upgrade",
  BREAK   = "break",
  ATTACK  = "attack",
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
  RANGED_ATTACKER          = 'ranged_attacker',
  HEALER            = 'healer',
  SCOUT             = 'scout',
}

export interface CreepDestroyOption {
  no_move?: boolean
  max_room?: number
}

export interface CreepSearchAndDestroyOption extends CreepDestroyOption {
  // structure_first?: boolean, // not implemented yet: use target_id
  ignore_source_keeper?: boolean
}

export interface CreepTransferOption {
  include?: ResourceConstant[]
  exclude?: ResourceConstant[]
}

export interface CreepChargeTargetOption {
  should_fully_charged?: boolean
}

declare global {
  interface Creep {
    squad: Squad
    initialize(): void
    boosted: boolean
    boost_info: {[index: string]: boolean}
    carrying_resources: ResourceConstant[]

    // General tasks
    moveToRoom(destination_room_name: string): ActionResult
    goToRenew(spawn: StructureSpawn): ActionResult
    makeShell(): ActionResult
    find_charge_target(opt?: CreepChargeTargetOption): StructureExtension | StructureSpawn | StructureTower | StructureTerminal | StructureLab | undefined
    transferResources(target: {store: StoreDefinition}, opt?: CreepTransferOption): ScreepsReturnCode
    withdrawResources(target: {store: StoreDefinition}, opt?: CreepTransferOption): ScreepsReturnCode
    dismantleObjects(target_room_name: string, specified_target: Structure | undefined, include_wall?: boolean): ActionResult

    // Worker tasks
    harvestFrom(source: Source): ActionResult
    work(room: Room, source: StructureContainer | StructureStorage | StructureTerminal | undefined): void
    buildTo(source: Source, target: ConstructionSite): ActionResult
    repairTo(source: Source, target: Structure, max_hits?: number): ActionResult
    upgrade(source_filter: StructureFilter | undefined): ActionResult
    searchAndDestroyTo(room_name: string, attack_anything: boolean, opt?: CreepSearchAndDestroyOption): ActionResult
    searchAndDestroy(opt?: CreepSearchAndDestroyOption): ActionResult
    healNearbyCreep(): ActionResult
    destroy(target: Creep | Structure, opt?: CreepDestroyOption): ActionResult

    // Controller tasks
    claim(target_room_name: string, should_claim?: boolean): ActionResult
  }

  interface CreepMemory {
    squad_name: string
    status: CreepStatus
    type: CreepType
    birth_time: number
    should_silent?: boolean
    should_notify_attack: boolean
    let_thy_die: boolean
  }
}

export function init() {
  Creep.prototype.initialize = function() {
    if ((this.memory.status == null) || (this.memory.status == undefined)) {
      this.memory.status = CreepStatus.NONE
    }

    this.boosted = false
    this.boost_info = {}

    for (const body of this.body) {
      if (body.boost) {
        this.boosted = true
        this.boost_info[body.type] = true
      }
    }

    this.carrying_resources = []
    for (const resource_type of Object.keys(this.carry)) {
      if ((this.carry[resource_type as ResourceConstant] || 0) == 0) {
        continue
      }
      this.carrying_resources.push(resource_type as ResourceConstant)
    }
  }

  // --- General tasks ---
  Creep.prototype.moveToRoom = function(destination_room_name: string): ActionResult {
    this.say(destination_room_name)

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
    else if ((destination_room_name == 'W48S39') && (Number(this.room.name.slice(4,6)) > 40)) {
      destination_room_name = 'W45S40'  // @fixme: this is waypoint
    }
    else if ((destination_room_name == 'W45S41') && (Number(this.room.name.slice(4,6)) > 42)) {
      // destination_room_name = 'W46S42'  // @fixme: this is waypoint
      destination_room_name = 'W45S45'  // @fixme: this is waypoint
    }
    else if (destination_room_name == 'W47S42') {
      if (Number(this.room.name.slice(4,6)) > 43) {
        destination_room_name = 'W46S43'  // @fixme: this is waypoint
      }
      else if (Number(this.room.name.slice(4,6)) > 44) {
        destination_room_name = 'W47S44'  // @fixme: this is waypoint
      }
    }
    else if ((destination_room_name == 'W42S48') && (Number(this.room.name.slice(1,3)) > 44)) {
      // destination_room_name = 'W46S42'  // @fixme: this is waypoint
      destination_room_name = 'W44S46'  // @fixme: this is waypoint
    }
    else if ((destination_room_name == 'W48S12') && (Number(this.room.name.slice(4,6)) > 15) && (Number(this.room.name.slice(1,3)) == 50)) {
      destination_room_name = 'W50S15'  // @fixme: this is waypoint
    }
    else if ((destination_room_name == 'W48S6') && (Number(this.room.name.slice(4,6)) > 7) && (Number(this.room.name.slice(1,3)) == 48)) {
      destination_room_name = 'W47S7'
    }
    else if ((destination_room_name == 'W48S6') && (Number(this.room.name.slice(4,6)) > 6) && ((Number(this.room.name.slice(1,3)) == 49) || (Number(this.room.name.slice(1,3)) == 50))) {
      destination_room_name = 'W50S6'
    }
    else if ((destination_room_name == 'W48S2') && (Number(this.room.name.slice(4,6)) > 3) && ((Number(this.room.name.slice(1,3)) == 48) || (Number(this.room.name.slice(1,3)) == 49) || (Number(this.room.name.slice(1,3)) == 50))) {
      destination_room_name = 'W50S3'
    }
    else if (((destination_room_name == 'W48S6') || (destination_room_name == 'W44S7')) && (Number(this.room.name.slice(4,6)) > 12) && ((Number(this.room.name.slice(1,3)) == 48) || (Number(this.room.name.slice(1,3)) == 49) || (Number(this.room.name.slice(1,3)) == 50))) {
      destination_room_name = 'W50S12'
    }
    else if ((destination_room_name == 'W44S7') && (Number(this.room.name.slice(1,3)) > 47)) {
      destination_room_name = 'W47S10'
    }
    else if ((destination_room_name == 'W33S7') && (Number(this.room.name.slice(1,3)) > 36)) {
      destination_room_name = 'W36S6'
    }
    else if ((destination_room_name == 'W44S7') && (Number(this.room.name.slice(1,3)) < 34)) {
      destination_room_name = 'W34S10'
    }
    else if ((destination_room_name == 'W44S7') && (Number(this.room.name.slice(1,3)) < 40)) {
      destination_room_name = 'W40S10'
    }
    else if ((destination_room_name == 'W43S2') && (Number(this.room.name.slice(4,6)) > 5)) {
      destination_room_name = 'W44S5'
    }
    else if ((destination_room_name == 'W43S2') && (Number(this.room.name.slice(4,6)) == 5)) {
      destination_room_name = 'W42S4'
    }

    if ((this.room.name == 'W44S42') && (destination_room_name == 'W45S43')) { // @fixme: temp code
      this.moveTo(0, 28)
      return ActionResult.IN_PROGRESS
    }

    if ((this.room.name == 'W45S42') && (destination_room_name == 'W45S43')) { // @fixme: temp code
      this.moveTo(25, 49)
      return ActionResult.IN_PROGRESS
    }

    if ((this.room.name == 'W44S42') && (destination_room_name == 'W44S43')) { // @fixme: temp code
      this.moveTo(0, 38, {
        ignoreCreeps: true,
      })
      return ActionResult.IN_PROGRESS
    }

    const exit = this.room.findExitTo(destination_room_name) as FindConstant
    if (exit < 0) {
      console.log(`Creep.moveToRoom ${destination_room_name} can't find exit ${exit}`)
      this.say('NOEXIT')
      return ActionResult.IN_PROGRESS
    }

    if ((this.room.name == 'W51S29') && (destination_room_name != this.room.name)) { // @fixme: temp code
      this.moveTo(21, 49)
      return ActionResult.IN_PROGRESS
    }

    const closest_exit = this.pos.findClosestByPath(exit)

    if ((this.room.name == 'W48S34') && (exit == RIGHT)) { // @fixme: temp code
      this.moveTo(49, 17)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W47S34') && (exit == RIGHT)) { // @fixme: temp code
      this.moveTo(49, 7)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W46S45') && (exit == TOP)) { // @fixme: temp code
      this.moveTo(27, 0)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W47S39') && (exit == RIGHT)) { // @fixme: temp code
      this.moveTo(49, 10)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W47S46') && (exit == RIGHT)) { // @fixme: temp code
      this.moveTo(49, 28)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W49S12') && (exit == RIGHT)) { // @fixme: temp code
      this.moveTo(49, 37)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W49S27') && (exit == TOP)) { // @fixme: temp code
      this.moveTo(31, 0)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W49S48') && (exit == TOP) && (this.getActiveBodyparts(ATTACK) > 0)) { // @fixme: temp code
      this.moveTo(24, 0)
      return ActionResult.IN_PROGRESS
    }
    else if (((this.room.name == 'W50S29') || (this.room.name == 'W50S28') || (this.room.name == 'W50S27')) && ((destination_room_name == 'W51S21') || (destination_room_name == 'W49S26'))) { // @fixme: temp code
      this.moveTo(18, 0)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W51S30') && ((destination_room_name == 'W51S21') || (destination_room_name == 'W49S26') || (destination_room_name == 'W49S27'))) { // @fixme: temp code
      this.moveTo(49, 8)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W50S30') && ((destination_room_name == 'W51S21') || (destination_room_name == 'W49S26'))) { // @fixme: temp code
      this.moveTo(20, 0)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W49S26') && ((destination_room_name == 'W48S19'))) { // @fixme: temp code
      this.moveTo(41, 0)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W49S25') && ((destination_room_name == 'W48S19'))) { // @fixme: temp code
      this.moveTo(49, 35)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W48S25') && ((destination_room_name == 'W48S19'))) { // @fixme: temp code
      this.moveTo(33, 0)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W48S24') && ((destination_room_name == 'W48S19'))) { // @fixme: temp code
      this.moveTo(35, 0)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W48S23') && ((destination_room_name == 'W48S19'))) { // @fixme: temp code
      this.moveTo(49, 23)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W47S23') && ((destination_room_name == 'W48S19'))) { // @fixme: temp code
      this.moveTo(9, 0)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W47S17') && (exit == TOP)) { // @fixme: temp code
      this.moveTo(19, 0)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W47S20') && (exit == TOP)) { // @fixme: temp code
      this.moveTo(16, 0)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W47S22') && (exit == TOP)) { // @fixme: temp code
      this.moveTo(32, 0)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W37S6') && (exit == RIGHT)) { // @fixme: temp code
      this.moveTo(49, 26)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W36S6') && (exit == RIGHT) && (this.pos.x > 35) && (this.pos.y > 39)) { // @fixme: temp code
      this.moveTo(49, 43)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W36S6') && (exit == RIGHT)) { // @fixme: temp code
      this.moveTo(49, 20)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W36S7') && (destination_room_name == 'W33S7' && (exit == TOP))) { // @fixme: temp code
      this.moveTo(38, 0)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W44S5') && (exit == RIGHT)) { // @fixme: temp code
      this.moveTo(49, 18)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W43S5') && (exit == RIGHT)) { // @fixme: temp code
      this.moveTo(49, 8)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W43S2') && (exit == TOP)) { // @fixme: temp code
      this.moveTo(49, 5)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W42S1') && (exit == LEFT)) { // @fixme: temp code
      this.moveTo(49, 24)
      return ActionResult.IN_PROGRESS
    }
    else if ((this.room.name == 'W42N2') && (exit == LEFT)) { // @fixme: temp code
      this.moveTo(30, 0)
      return ActionResult.IN_PROGRESS
    }


    if ((destination_room_name == 'W49S26') && (Number(this.room.name.slice(4, 6)) > 26)) {
      // destination_room_name = 'W46S42'  // @fixme: this is waypoint
      destination_room_name = 'W50S26'  // @fixme: this is waypoint
    }

    if (this.moveTo(closest_exit) == ERR_NO_PATH) {
      this.say('NOPATH')
        // To avoid ERR_NO_PATH on room borders
      if (this.pos.x <= 1) {
        if (this.move(RIGHT) == OK) {
          return ActionResult.IN_PROGRESS
        }
      }
      if (this.pos.x >= 48) {
        if (this.move(LEFT) == OK) {
          return ActionResult.IN_PROGRESS
        }
      }
      if (this.pos.y <= 1) {
        if (this.move(BOTTOM) == OK) {
          return ActionResult.IN_PROGRESS
        }
      }
      if (this.pos.y >= 48) {
        if (this.move(TOP) == OK) {
          return ActionResult.IN_PROGRESS
        }
      }
      if (this.room.name == 'W46S42') {
        this.moveTo(30, 44)
        return ActionResult.IN_PROGRESS
      }
      // this.moveTo(closest_exit, {
      //   // swampCost: 1,
      //   maxOps: 10000,  // @fixme: It INCREASES SPU cost
      // } as MoveToOpts)
    }

    return ActionResult.IN_PROGRESS
  }

  Creep.prototype.goToRenew = function(spawn: StructureSpawn): ActionResult {
    if ((this.ticksToLive || 0) >= 1400) {
      this.memory.status = CreepStatus.NONE
      return ActionResult.DONE
    }
    else if ((this.room.name == 'W49S34') && (this.room.energyAvailable < 10) && ((this.ticksToLive || 0) >= 1200)) {
      this.memory.status = CreepStatus.NONE
      return ActionResult.DONE
    }

    if (this.memory.let_thy_die) {
      console.log(`Creep.goToRenew unexpectedly found let_thy_die is true ${this.name}`)
      return ActionResult.DONE
    }

    this.memory.status = CreepStatus.WAITING_FOR_RENEW
    this.moveTo(spawn)
    this.transfer(spawn, RESOURCE_ENERGY)

    return ActionResult.IN_PROGRESS
  }

  /**
   * returns IN_PROGRESS if the creep should work as usual
   * returns DONE if the creep does something in this method
   */
  Creep.prototype.makeShell = function(): ActionResult {
    return ActionResult.IN_PROGRESS // This method DOES NOT WORK since RCL is insufficient to build rampart

    // if (this.room.controller && this.room.controller.my) {  // It should be this.room.towers.length > 0 but for computing resource
    //   return ActionResult.IN_PROGRESS
    // }
    // if ((this.getActiveBodyparts(WORK) == 0) || (this.carry.energy == 0)) {
    //   return ActionResult.IN_PROGRESS
    // }

    // const construction_site_obj = this.room.lookAt(this).filter((obj) => {
    //   return (obj.type == LOOK_CONSTRUCTION_SITES)
    // })[0]

    // if (construction_site_obj) {
    //   const build_result = this.build(construction_site_obj.constructionSite!)
    //   if (build_result != OK) {
    //     console.log(`Creep.makeShell() unexpected build result ${build_result}, ${this.name} at ${this.pos}`)
    //     return ActionResult.IN_PROGRESS
    //   }
    //   return ActionResult.DONE
    // }

    // const rampart_obj = this.room.lookAt(this).filter((obj) => {
    //   return (obj.type == LOOK_STRUCTURES) && (obj.structure!.structureType == STRUCTURE_RAMPART)
    // })[0]

    // if (rampart_obj && (rampart_obj.structure!.hits < 40000)) {
    //   const repair_result = this.repair(rampart_obj.structure!)
    //   if (repair_result != OK) {
    //     console.log(`Creep.makeShell() unexpected repair result ${repair_result}, ${this.name} at ${this.pos}`)
    //     return ActionResult.IN_PROGRESS
    //   }
    //   return ActionResult.DONE
    // }
    // else {
    //   const construction_result = this.room.createConstructionSite(this.pos.x, this.pos.y, STRUCTURE_RAMPART)
    //   if (construction_result != OK) {
    //     console.log(`Creep.makeShell() unexpected createConstructionSite result ${construction_result}, ${this.name} at ${this.pos}`)
    //     return ActionResult.IN_PROGRESS
    //   }
    //   return ActionResult.IN_PROGRESS
    // }
  }

  Creep.prototype.find_charge_target = function(opt?: CreepChargeTargetOption): StructureExtension | StructureSpawn | StructureTower | StructureTerminal | StructureLab | undefined {
    const options = opt || {}
    const is_attacked = this.room.attacked

    return this.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: structure => {
        if (structure.structureType == STRUCTURE_EXTENSION) {
          return (structure.energy < structure.energyCapacity)
        }
        else if (structure.structureType == STRUCTURE_SPAWN) {
          const capacity = options.should_fully_charged ? structure.energyCapacity : (structure.energyCapacity - 50)
          return structure.energy < capacity
        }
        else if (structure.structureType == STRUCTURE_TOWER) {
          let margin = this.room.attacked ? 100 : 200
          const capacity = options.should_fully_charged ? structure.energyCapacity : (structure.energyCapacity - margin)
          return structure.energy < capacity
        }
        else if (!is_attacked) {
          if (structure.structureType == STRUCTURE_POWER_SPAWN) {
            return (structure.energy < structure.energyCapacity)
          }
          else if (structure.structureType == STRUCTURE_TERMINAL) {
            // if (this.room.name == 'W49S48') {
            //   return true// @fixme:
            // }
            return (structure.store.energy < 100000) && !(!structure.room.storage) && (structure.room.storage.store.energy > 20000)
          }
          else if (structure.structureType == STRUCTURE_LAB) {
            return (structure.energy < (structure.energyCapacity - 100))
          }
          // else if (structure.structureType == STRUCTURE_NUKER) {
          //   return (structure.energy < structure.energyCapacity)
          // }
        }
        return false
      }
    }) as StructureExtension | StructureSpawn | StructureTower | StructureTerminal | StructureLab | undefined
  }

  Creep.prototype.transferResources = function(target: StructureContainer | StructureStorage | StructureTerminal, opt?: CreepTransferOption): ScreepsReturnCode {
    opt = opt || {}

    let return_code: ScreepsReturnCode = ERR_NOT_ENOUGH_RESOURCES
    for (const key of Object.keys(this.carry)) {
      const resource_type = key as ResourceConstant
      if (opt.include) {
        if (opt.include.indexOf(resource_type) < 0) {
          continue
        }
      }
      else if (opt.exclude) {
        if (opt.exclude.indexOf(resource_type) >= 0) {
          continue
        }
      }

      if (this.carry[resource_type] == 0) {
        continue
      }
      return_code = this.transfer(target, resource_type)
      if (return_code != OK) {
        return return_code
      }
    }
    return return_code
  }

  Creep.prototype.withdrawResources = function(target: StructureContainer | StructureStorage | StructureTerminal, opt?: CreepTransferOption): ScreepsReturnCode {
    opt = opt || {}

    let return_code: ScreepsReturnCode = ERR_NOT_ENOUGH_RESOURCES
    for (const key of Object.keys(target.store)) {
      const resource_type = key as ResourceConstant
      if (opt.include) {
        if (opt.include.indexOf(resource_type) < 0) {
          continue
        }
      }
      else if (opt.exclude) {
        if (opt.exclude.indexOf(resource_type) >= 0) {
          continue
        }
      }

      if (this.carry[resource_type] == 0) {
        continue
      }
      return_code = this.withdraw(target, resource_type)
      if (return_code != OK) {
        return return_code
      }
    }
    return return_code
  }

  Creep.prototype.dismantleObjects = function(target_room_name: string, specified_target: Structure | undefined, include_wall?: boolean): ActionResult {
    if (this.getActiveBodyparts(WORK) == 0) {
      this.say(`ERROR`)
      return ActionResult.IN_PROGRESS
    }

    this.drop(RESOURCE_ENERGY)

    if (this.moveToRoom(target_room_name) != ActionResult.DONE) {
      this.say(target_room_name)
      return ActionResult.IN_PROGRESS
    }

    if (specified_target) {
      if (this.dismantle(specified_target) == ERR_NOT_IN_RANGE) {
        this.moveTo(specified_target)
      }
      return ActionResult.IN_PROGRESS
    }

    const target = this.pos.findClosestByPath(FIND_HOSTILE_SPAWNS)

    if (target) {
      if (this.dismantle(target) == ERR_NOT_IN_RANGE) {
        this.moveTo(target)
      }
    }
    else {
      const structure = this.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
        filter: (structure) => {
          if (structure.structureType == STRUCTURE_CONTROLLER) {
            return false
          }
          else if (structure.structureType == STRUCTURE_STORAGE) {
            return _.sum((structure as StructureStorage).store) < 1000
          }
          return true
        }
      })
      if (structure) {
        if (this.dismantle(structure) == ERR_NOT_IN_RANGE) {
          this.moveTo(structure)
        }
      }
      else {
        const construction_site = this.pos.findClosestByPath(FIND_HOSTILE_CONSTRUCTION_SITES)

        if (construction_site) {
          this.moveTo(construction_site)
        }
        else {
          const wall = this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
              if ((structure as {my?: boolean}).my) {
                return false
              }
              return (structure.structureType == STRUCTURE_RAMPART)
                || (structure.structureType == STRUCTURE_WALL)
            }
          })

          if (wall && include_wall) {
            if (this.dismantle(wall) == ERR_NOT_IN_RANGE) {
              this.moveTo(wall)
            }
          }
          else {
            this.say('DONE')
            console.log(`No more targets in ${target_room_name}, ${this.name}`)
            return ActionResult.DONE
          }
        }
      }
    }
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

  /**
   * source_filter: Filter structure that creep can withdrow from it
   */
  Creep.prototype.upgrade = function(source_filter: StructureFilter | undefined): ActionResult {
    if (!this.room.controller || !this.room.controller.my) {
      console.log(`Creep.upgrade the room is not owned ${this.room.controller}, ${this.name}`)
      return ActionResult.DONE
    }

    if ((this.memory.status == CreepStatus.NONE) || (this.carry.energy == 0)) {
      this.memory.status = CreepStatus.HARVEST
    }

    // Withdraw
    if (this.memory.status == CreepStatus.HARVEST) {
      const target = this.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: source_filter
      })

      if (!target) {
        this.say('NO Src')
        return ActionResult.DONE
      }
      else if (this.carry.energy == this.carryCapacity) {
        this.memory.status = CreepStatus.UPGRADE
      }
      else if (this.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        this.moveTo(target)
        return ActionResult.IN_PROGRESS
      }
    }

    // Upgrade
    if (this.memory.status == CreepStatus.UPGRADE) {
      if (this.carry.energy == 0) {
        this.memory.status = CreepStatus.HARVEST
      }
      else {
        this.upgradeController(this.room.controller)
        this.moveTo(this.room.controller)
      }
    }
    return ActionResult.IN_PROGRESS
  }

  // --- Work ---
  Creep.prototype.work = function(room: Room, source: StructureContainer | StructureStorage | StructureTerminal | undefined): void {
    if (!room) {
      console.log(`Creep.work room not specified ${this.name}`)
    }

    // if ((this.room.name == 'W49S48') && ((this.memory.status == CreepStatus.BUILD) || (this.memory.status == CreepStatus.CHARGE)) && this.room.controller && this.room.controller.my && (this.room.controller.level < 3)) {
    //   this.memory.status = CreepStatus.UPGRADE
    // }

    if ((_.sum(this.carry) > this.carry.energy) && this.room.storage) {
      if (this.transferResources(this.room.storage) == ERR_NOT_IN_RANGE) {
        this.moveTo(this.room.storage)
        return
      }
    }

    let debug_say = false

    // if (this.room.name == 'W33S7') {
    //   debug_say = true
    // }

    if ((this.memory.status == CreepStatus.NONE) || (this.carry.energy == 0)) {
      this.memory.status = CreepStatus.HARVEST

      if (debug_say) {
        this.say('N2H')
      }
    }

    if ((this.memory.type == CreepType.CARRIER) && ((this.memory.status == CreepStatus.BUILD) || (this.memory.status == CreepStatus.UPGRADE))) {
      this.memory.status = CreepStatus.CHARGE
      if (debug_say) {
        this.say('B2C-1')
      }
    }

    let should_harvest_from_link = false

    let charge_target: StructureExtension | StructureSpawn | StructureTerminal | StructureTower | StructureLab | undefined
    let find_charge_target = false

    // Harvest
    if (this.memory.status == CreepStatus.HARVEST) {
      if (this.carry.energy == this.carryCapacity) {
        this.memory.status = CreepStatus.CHARGE
        if (debug_say) {
          this.say('H2C')
        }

        // if ((Game.shard.name == 'swc') && this.room.controller && (this.room.controller.ticksToDowngrade < 1000)) {
        //   this.memory.status = CreepStatus.UPGRADE
        // }

        const should_split_charger_and_upgrader = (this.room.attacked == false) && (Game.shard.name == 'shard2')

        if (should_split_charger_and_upgrader) { // @fixme: temp code
          let number = 0

          for (const creep_name in Game.creeps) {
            const creep = Game.creeps[creep_name]

            if ((creep.room.name == this.room.name) && (creep.memory.type == CreepType.WORKER)) {
              if (creep.memory.status == CreepStatus.CHARGE) {
                number += 1
              }
            }
          }

          if (number > 3) {
            this.memory.status = CreepStatus.BUILD
            if (debug_say) {
              this.say('C2B-1')
            }
          }
        }
      }
      else {
        if ((this.room.name != 'W51S29')) {
          // To not pickup harvesters drop
          let drop: Resource | undefined
          const opt = {
            filter: (resource: Resource) => {
              return resource.resourceType == RESOURCE_ENERGY
            }
          }

          if (this.room.name == 'W49S19') {
            drop = this.pos.findClosestByPath(FIND_DROPPED_RESOURCES, opt)
          }
          else {
            drop = this.pos.findInRange(FIND_DROPPED_RESOURCES, 4, opt)[0] as Resource | undefined
          }

          if (drop) {
            if (this.pickup(drop) == ERR_NOT_IN_RANGE) {
              this.moveTo(drop)
              return
            }
          }
          const tomb = this.pos.findInRange(FIND_TOMBSTONES, 4, {
            filter: (t: Tombstone) => t.store.energy > 0
          })[0]
          if (tomb) {
            if (this.withdraw(tomb, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
              this.moveTo(tomb)
              return
            }
          }
        }

        let link: StructureLink | undefined

        switch (this.room.name) {
          case 'W48S47':
            link = Game.getObjectById('5aee959afd02f942b0a03361') as StructureLink
            break

          case 'W49S47':
            link = Game.getObjectById('5af1900395fe4569eddba9da') as StructureLink
            break

          case 'W49S48':
            link = Game.getObjectById('5b0a45f2f30cc0671dc1e8e1') as StructureLink
            break

          case 'W48S39':
            link = Game.getObjectById('5b0a2b654e8c62672f3191fb') as StructureLink
            break

          default:
            break
        }

        if (link && (link.energy > 0)) {
          if (this.withdraw(link, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            this.moveTo(link)
            return
          }
          else if (this.room.storage) {
            this.transfer(this.room.storage, RESOURCE_ENERGY)
          }

          return
        }

        if (source && (source.room.name == this.room.name) && (source.store.energy > 0)) {
          if (this.withdraw(source!, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            this.moveTo(source!)
            return
          }
        }
        // else if (this.room.name == 'W49S34') {
        //   const source = this.room.sources[this.memory.birth_time % 2]
        //   if (source && ((source.energy > 0) || (source.ticksToRegeneration < 10))) {
        //     if (this.harvest(source) == ERR_NOT_IN_RANGE) {
        //       this.moveTo(source)
        //       return
        //     }
        //   }
        //   else {
        //     const target = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE)

        //     if (this.harvest(target) == ERR_NOT_IN_RANGE) {
        //       this.moveTo(target)
        //       return
        //     }
        //   }
        // }
        else {
          const target = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE)

          if (target) {
            if (this.harvest(target) == ERR_NOT_IN_RANGE) {
              this.moveTo(target)
              return
            }
          }
          else {
            const target = this.pos.findClosestByPath(FIND_SOURCES)
            if (this.harvest(target) == ERR_NOT_IN_RANGE) {
              this.moveTo(target)
              return
            }
          }
        }
      }
    }

    // if ((this.memory.status == CreepStatus.UPGRADE) && (((Game.time - this.memory.birth_time) % 5) == 0)) {
    //   this.memory.status = CreepStatus.CHARGE
    // }

    // Charge
    if (this.memory.status == CreepStatus.CHARGE) {
      // if (this.room.name == 'W49S34') {
      //   const container = this.pos.findInRange(FIND_STRUCTURES, 2, {
      //     filter: (structure: AnyStructure) => {
      //       return (structure.structureType == STRUCTURE_CONTAINER) && (_.sum(structure.store) < structure.storeCapacity)
      //     }
      //   })[0]

      //   if (container) {
      //     if (this.transfer(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
      //       this.moveTo(container)
      //       return
      //     }
      //   }
      // }

      const target = this.find_charge_target()
      charge_target = target
      find_charge_target = true

      if (!target) {
        if (this.memory.type != CreepType.CARRIER) {
          this.memory.status = CreepStatus.BUILD
          if (debug_say) {
            this.say('C2B-2')
          }
        }
      }
      else if (this.carry.energy == 0) {
        this.memory.status = CreepStatus.HARVEST
        if (debug_say) {
          this.say('C2H-1')
        }
    }
      else if (this.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        this.moveTo(target)
        return
      }
    }

    // Build
    if (this.memory.status == CreepStatus.BUILD) {
      if (this.room.attacked) {
        const is_safemode_active = (this.room && this.room.controller && this.room.controller.my) ? ((this.room!.controller!.safeMode || 0) > 0) : false

        if (!find_charge_target) {
          const target = this.find_charge_target()
          charge_target = target
          find_charge_target = true
        }

        if (!is_safemode_active && charge_target) {
          console.log(`${this.room} remain charge`)
          this.memory.status = CreepStatus.CHARGE
          if (debug_say) {
            this.say('B2C-2')
          }
          return
        }
      }

      if (this.room.controller && this.room.controller.my && (this.room.controller.ticksToDowngrade < 3000)) {
        this.memory.status = CreepStatus.UPGRADE
        if (debug_say) {
          this.say('B2U-1')
        }
      }
    }

    if (this.memory.status == CreepStatus.BUILD) {

      // if (this.room.name == 'W49S34') {
      //   const damaged_structure = this.pos.findClosestByPath(FIND_STRUCTURES, {
      //     filter: (structure) => {
      //       return ((structure.structureType == STRUCTURE_ROAD) || (structure.structureType == STRUCTURE_CONTAINER))
      //         && (structure.hits < (structure.hitsMax * 0.6))
      //     }
      //   })

      //   if (damaged_structure) {
      //     if (this.repair(damaged_structure) == ERR_NOT_IN_RANGE) {
      //       this.moveTo(damaged_structure)
      //     }
      //     return
      //   }
      // }

      const target = this.pos.findClosestByPath(FIND_CONSTRUCTION_SITES, {
        filter: (site) => site.my
      })


      let should_upgrade = true
      if (['dummy'].indexOf(this.room.name) >= 0) {
        let number = 0

        for (const creep_name in Game.creeps) {
          const creep = Game.creeps[creep_name]

          if ((creep.room.name == this.room.name) && (creep.memory.type == CreepType.WORKER)) {
            if (creep.memory.status == CreepStatus.UPGRADE) {
              number += 1
            }
          }
        }

        if (number > 0) {
          should_upgrade = false
        }
        if (this.room.storage && (this.room.storage.store.energy > 500000)) {
          should_upgrade = true
        }
      }

      if (this.room.name == 'W48S39') {
        should_upgrade = false
      }

      if (!target) {
        if (should_upgrade) {
          this.memory.status = CreepStatus.UPGRADE
          if (debug_say) {
            this.say('B2U-2')
          }
        }
        else {
          this.memory.status = CreepStatus.HARVEST
          if (debug_say) {
            this.say('B2H-1')
          }

          if (this.room.storage) {
            this.transfer(this.room.storage, RESOURCE_ENERGY)

            should_harvest_from_link = true
          }
        }
      }
      else if (this.carry.energy == 0) {
        this.memory.status = CreepStatus.HARVEST
        if (debug_say) {
          this.say('B2H-2')
        }

      }
      else {
        this.build(target)
        this.moveTo(target)
        return
      }
    }

    // Upgrade
    if (this.memory.status == CreepStatus.UPGRADE) {
      if (this.room.attacked) {
        const is_safemode_active = (this.room && this.room.controller && this.room.controller.my) ? ((this.room!.controller!.safeMode || 0) > 0) : false

        if (!find_charge_target) {
          const target = this.find_charge_target()
          charge_target = target
          find_charge_target = true
        }

        if (!is_safemode_active && charge_target) {
          this.memory.status = CreepStatus.CHARGE
          if (debug_say) {
            this.say('U2C-1')
          }
            return
        }
      }
    }

    if (this.memory.status == CreepStatus.UPGRADE) {
      if (this.carry.energy == 0) {
        this.memory.status = CreepStatus.HARVEST
        if (debug_say) {
          this.say('U2H-1')
        }
      }
      else if ((['W49S47', 'W48S47'].indexOf(this.room.name) >= 0) && this.room.storage && ((this.room.storage.store.energy + (this.room.terminal || {store: {energy: 0}}).store.energy) < 20000) && (this.room.controller) && (this.room.controller.ticksToDowngrade > 30000)) {
        this.memory.status = CreepStatus.CHARGE
        if (debug_say) {
          this.say('U2C-2')
        }
        return
      }
      else {
        this.upgradeController(room.controller!)
        this.moveTo(room.controller!)
        return
      }
    }

    // ---
    if (should_harvest_from_link) {
      let link: StructureLink | undefined

      switch (this.room.name) {
        case 'W48S47':
          link = Game.getObjectById('5aee959afd02f942b0a03361') as StructureLink
          break

        case 'W49S47':
          link = Game.getObjectById('5af1900395fe4569eddba9da') as StructureLink
          break

        case 'W49S48':
          link = Game.getObjectById('5b0a45f2f30cc0671dc1e8e1') as StructureLink
          break

        case 'W48S39':
          link = Game.getObjectById('5b0a2b654e8c62672f3191fb') as StructureLink
          break

        default:
          break
      }

      if (link && (link.energy > 0)) {
        if (this.withdraw(link, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          this.moveTo(link)
          return
        }
        else if (this.room.storage) {
          this.transfer(this.room.storage, RESOURCE_ENERGY)
        }

        return
      }
    }
  }

  Creep.prototype.healNearbyCreep = function(): ActionResult {
    if (this.hits < this.hitsMax) {
      this.heal(this)
      return ActionResult.IN_PROGRESS
    }
    else {
      const heal_target = this.pos.findInRange(FIND_MY_CREEPS, 3, {
        filter: (creep: Creep) => {
          return creep.hits < creep.hitsMax
        }
      })[0]

      if (heal_target) {
        if (this.heal(heal_target) == ERR_NOT_IN_RANGE) {
          this.rangedHeal(heal_target)
        }
        return ActionResult.IN_PROGRESS
      }
      else {
        this.heal(this)
        return ActionResult.DONE
      }
    }
  }

  Creep.prototype.searchAndDestroyTo = function(room_name: string, attack_anything: boolean, opt?: CreepSearchAndDestroyOption): ActionResult {
    opt = opt || {}
    const memory = this.memory as {target_id?: string}

    if (this.room.name != room_name) {
      let hostile_creep: Creep | undefined
      if (attack_anything) {
        hostile_creep = this.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
          filter: (creep) => {
            if (creep.owner.username == 'Source Keeper') {
              return false
            }
            return true
          }
        })
      }
      else {
        hostile_creep = this.pos.findInRange(FIND_HOSTILE_CREEPS, 4, {
          filter: (creep: Creep) => {
            if (creep.owner.username == 'Source Keeper') {
              return false
            }
            return true
          }
        })[0]
      }

      const hostile_nearby = !(!hostile_creep) && this.pos.inRangeTo(hostile_creep.pos.x, hostile_creep.pos.y, 4)

      if (hostile_nearby) {
        return this.destroy(hostile_creep)
      }

      if (memory.target_id) {
        const specified_target = Game.getObjectById(memory.target_id) as Creep | Structure | undefined

        if (specified_target) {
          return this.destroy(specified_target)
        }
      }

      if (hostile_creep) {
        this.destroy(hostile_creep, opt)

        if (opt.no_move) {
          this.moveToRoom(room_name)
        }

        return ActionResult.IN_PROGRESS
      }
    }

    if (this.moveToRoom(room_name) == ActionResult.IN_PROGRESS) {
      this.healNearbyCreep()
      return ActionResult.IN_PROGRESS
    }

    return this.searchAndDestroy(opt)
  }

  Creep.prototype.searchAndDestroy = function(opt?: CreepSearchAndDestroyOption): ActionResult {
    opt = opt || {}

    if ((this.getActiveBodyparts(ATTACK) + this.getActiveBodyparts(RANGED_ATTACK)) == 0) {
      console.log(`searchAndDestroy no attacker body parts ${this.name}`)
      this.say('DAMAGED')
      // return ActionResult.DONE
    }

    const memory = this.memory as {target_id?: string}

    const hostile_attacker: Creep = this.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
      filter: (creep) => {
        const is_attacker = creep.body.filter((body: BodyPartDefinition) => {
          return (body.type == ATTACK) || (body.type == RANGED_ATTACK) || (body.type == HEAL)
        }).length > 0

        if (!is_attacker) {
          return false
        }

        if (opt!.ignore_source_keeper && creep.owner.username == 'Source Keeper') {
          return false
        }
        return true
      }
    })

    const hostile_nearby = !(!hostile_attacker) && this.pos.inRangeTo(hostile_attacker.pos.x, hostile_attacker.pos.y, 4)

    if (hostile_nearby) {
      return this.destroy(hostile_attacker)
    }

    if ((this.hits < (this.hitsMax - 100)) && (this.getActiveBodyparts(HEAL) > 3)) {
      this.heal(this)
      return ActionResult.IN_PROGRESS
    }

    if (memory.target_id) {
      const specified_target = Game.getObjectById(memory.target_id) as Creep | Structure | undefined

      if (specified_target) {
        return this.destroy(specified_target)
      }
    }

    const hostile_tower: StructureTower = this.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
      filter: (structure) => {
        return structure.structureType == STRUCTURE_TOWER
      }
    }) as StructureTower
    if (hostile_tower) {
      return this.destroy(hostile_tower)
    }

    const hostile_spawn: StructureSpawn = this.pos.findClosestByPath(FIND_HOSTILE_SPAWNS)
    if (hostile_spawn) {
      return this.destroy(hostile_spawn)
    }

    const hostile_creep: Creep = this.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
      filter: (creep) => {
        if (creep.pos.x == 0) {
          return false
        }
        if (creep.pos.x == 49) {
          return false
        }
        if (creep.pos.y == 0) {
          return false
        }
        if (creep.pos.y == 49) {
          return false
        }
        if (opt!.ignore_source_keeper && creep.owner.username == 'Source Keeper') {
          return false
        }
        return true
      }
    })
    if (hostile_creep) {
      return this.destroy(hostile_creep)
    }

    const hostile_structure: AnyStructure = this.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (structure) => {
        if (structure.room.controller && structure.room.controller.my) {
          return false
        }
        if ((structure as AnyOwnedStructure).my) {
          return false
        }

        const ignore: StructureConstant[] = [
          STRUCTURE_CONTROLLER,
          STRUCTURE_RAMPART,
          STRUCTURE_WALL,
          STRUCTURE_KEEPER_LAIR,
          STRUCTURE_POWER_BANK,
        ]
        if (ignore.indexOf(structure.structureType) >= 0) {
          return false
        }
        if ((structure.structureType) == STRUCTURE_CONTAINER) {
          if (structure.room.controller) {
            if (structure.room.controller.my) {
              return false
            }
            else if (structure.room.controller.owner) {
              return true
            }
            else if (structure.room.controller.reservation && (structure.room.controller.reservation.username != 'Mitsuyoshi')) {
              return true
            }
          }
          return false
        }
        if ((structure.structureType) == STRUCTURE_ROAD) {
          if (structure.room.controller) {
            if (structure.room.controller.my) {
              return false
            }
            else if (structure.room.controller.owner) {
              return true
            }
            else if (structure.room.controller.reservation && (structure.room.controller.reservation.username != 'Mitsuyoshi')) {
              return true
            }
          }
          return false
        }
        return true
      }
    })
    if (hostile_structure) {
      return this.destroy(hostile_structure)
    }

    this.heal(this)

    // console.log('searchAndDestroy done')
    return ActionResult.DONE
  }

  Creep.prototype.destroy = function(target: Creep | Structure, opt?: CreepDestroyOption): ActionResult {
    opt = opt || {}

    if (this.spawning) {
      return ActionResult.IN_PROGRESS
    }

    if ((target as {my: boolean}).my) {
      this.say(`ERR!!`)
      const message = `Creep.destroy this IS my Creep | Structure ${target} ${target.pos} attacker: ${this.name}`
      console.log(message)
      Game.notify(message)
      return ActionResult.IN_PROGRESS
    }

    const is_ranged_attacker = (this.getActiveBodyparts(RANGED_ATTACK) > 0) && (this.getActiveBodyparts(ATTACK) == 0)

    if (is_ranged_attacker && (this.pos.getRangeTo(target) <= 1)) {
      opt.no_move = true
    }

    if (((Game.time % 3) == 0) && !(this.memory as {should_silent?: boolean}).should_silent) {
      this.say(`T${target.pos.x},${target.pos.y}`)
    }

    // if ((target as Creep).carry) {
    //   if (((target as Creep).getActiveBodyparts(RANGED_ATTACK) > 0) && (((target as Creep).getActiveBodyparts(ATTACK) == 0))) {
    //     no_move = true
    //   }
    // }

    let ranged_target: Creep | Structure = target
    let should_flee = false
    const is_creep = !(!(target as Creep).carry)

    if (is_creep) {
      if (!opt.no_move && is_ranged_attacker) {
        const hostile_creep = target as Creep
        if (this.pos.getRangeTo(hostile_creep) < 4) {
          const filter = function(creep: Creep): boolean {
            return (creep.getActiveBodyparts(ATTACK) + creep.getActiveBodyparts(RANGED_ATTACK)) > 0
          }
          if ((hostile_creep.getActiveBodyparts(ATTACK) > 1) || (hostile_creep.pos.findInRange(FIND_HOSTILE_CREEPS, 2, {filter}).length > 1)) {
            should_flee = true
          }
        }
      }
    }
    else {
      const creep_nearby = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3)[0]

      if (creep_nearby) {
        ranged_target = creep_nearby
      }
    }

    const ranged_attack_result = this.rangedAttack(ranged_target) // @todo: If target only has ATTACK, run and rangedAttack
    const attack_result = this.attack(target)

    if (attack_result != OK) {
      this.heal(this)
    }

    // const move_to_result = no_move ? OK : this.moveTo(target)
    // if ((ranged_attack_result != OK) || (move_to_result != OK) || (attack_result != OK)) {
    //   console.log(`Creep.destroy action failed ${ranged_attack_result}, ${move_to_result}, ${attack_result}, ${this.name}`)
    // }

    if (!opt.no_move) {
      if (should_flee) {
        this.say(`FLEE`)  // @fixme

        const goal: {pos: RoomPosition, range: number} = {
          pos: target.pos,
          range: 8,
        }
        const path: PathFinderPath = PathFinder.search(this.pos, goal, {
          flee: true,
          maxRooms: 2,
        })

        if (path.path.length > 0) {
          this.say(`FLEEp`)  // @fixme
          // console.log(`FLEE ${path.path} ${path.path[0] ? path.path[0] : "NO PATH"}, incompleted: ${path.incomplete} ${this.name}`)

          this.moveByPath(path.path)
          return ActionResult.IN_PROGRESS // @todo: Check if finished
        }
      }
      // if (opt.max_room) {
        this.moveTo(target, {
          maxRooms: 1
        })
      // }
      // else {
      //   this.moveTo(target)
      // }
    }

    return ActionResult.IN_PROGRESS // @todo: Check if finished
  }

  Creep.prototype.claim = function(target_room_name: string, should_claim?: boolean): ActionResult {

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
      return ActionResult.DONE
    }

    let result: number
    let action: string

    if ((target.owner && target.owner.username) && (target.ticksToDowngrade > 1000)) {
      action = 'attackController'
      result = this.attackController(target)
    }
    else if (should_claim) {
      action = 'claimController'
      result = this.claimController(target)
    }
    else {
      action = 'reserveController'
      result = this.reserveController(target)
    }

    switch (result) {
      case OK:
      case ERR_BUSY:
      case ERR_TIRED:
        return ActionResult.IN_PROGRESS

      case ERR_NOT_IN_RANGE:
        this.moveTo(target)
        return ActionResult.IN_PROGRESS

      case ERR_GCL_NOT_ENOUGH:
        console.log(`Creep.claim ${action} GCL not enough ${result}, ${this.name}`)
        this.moveTo(target)
        this.reserveController(target)
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
