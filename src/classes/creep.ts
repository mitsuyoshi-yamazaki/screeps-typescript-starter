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
  HEALER            = 'healer',
  SCOUT             = 'scout',
}

declare global {
  interface Creep {
    squad: Squad
    initialize(): void
    boosted: boolean
    carrying_resources: ResourceConstant[]

    // General tasks
    moveToRoom(destination_room_name: string): ActionResult
    goToRenew(spawn: StructureSpawn): ActionResult
    makeShell(): ActionResult

    // Worker tasks
    harvestFrom(source: Source): ActionResult
    work(room: Room, source: StructureContainer | StructureStorage | StructureTerminal | undefined): void
    buildTo(source: Source, target: ConstructionSite): ActionResult
    repairTo(source: Source, target: Structure, max_hits?: number): ActionResult
    upgrade(source_filter: StructureFilter | undefined): ActionResult
    searchAndDestroy(no_move?: boolean): ActionResult
    destroy(target: Creep | Structure, no_move?: boolean): ActionResult

    // Controller tasks
    claim(target_room_name: string, should_claim?: boolean): ActionResult
  }

  interface CreepMemory {
    squad_name: string
    status: CreepStatus
    type: CreepType
    birth_time: number
    let_thy_die: boolean
  }
}

export function init() {
  Creep.prototype.initialize = function() {
    if ((this.memory.status == null) || (this.memory.status == undefined)) {
      this.memory.status = CreepStatus.NONE
    }

    this.boosted = false
    for (const body of this.body) {
      if (body.boost) {
        this.boosted = true
        break
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
    if ((destination_room_name == 'W48S39') && (Number(this.room.name.slice(4,6)) > 40)) {
      destination_room_name = 'W45S40'  // @fixme: this is waypoint
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
      return ActionResult.IN_PROGRESS
    }

    const closest_exit = this.pos.findClosestByPath(exit)

    if (this.moveTo(closest_exit) == ERR_NO_PATH) {
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

    if ((this.room.name == 'W49S48') && ((this.memory.status == CreepStatus.BUILD) || (this.memory.status == CreepStatus.CHARGE)) && this.room.controller && this.room.controller.my && (this.room.controller.level < 3)) {
      this.memory.status = CreepStatus.UPGRADE
    }

    if ((this.memory.status == CreepStatus.NONE) || (this.carry.energy == 0) || (this.room.attacked == true)) {
      this.memory.status = CreepStatus.HARVEST
    }

    if ((this.memory.type == CreepType.CARRIER) && ((this.memory.status == CreepStatus.BUILD) || (this.memory.status == CreepStatus.UPGRADE))) {
      this.memory.status = CreepStatus.CHARGE
    }

    // Harvest
    if (this.memory.status == CreepStatus.HARVEST) {
      if (this.carry.energy == this.carryCapacity) {
        this.memory.status = CreepStatus.CHARGE

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
          }
        }
      }
      else {
        // if (this.room.name == 'W49S48') {
        // // To not pickup harvesters drop
        // const drop = this.pos.findClosestByPath(FIND_DROPPED_RESOURCES) as Resource
        // if (drop) {
        //   if (this.pickup(drop) == ERR_NOT_IN_RANGE) {
        //     this.moveTo(drop)
        //     return
        //   }
        // }
        // const tomb = this.pos.findClosestByPath(FIND_TOMBSTONES, {
        //   filter: (t) => t.store.energy > 0
        // })
        // if (tomb) {
        //   if (this.withdraw(tomb, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        //     this.moveTo(tomb)
        //     return
        //   }
        // }
        // }

        if (this.room.name == 'W49S48') {
          const link = Game.getObjectById('5b0a45f2f30cc0671dc1e8e1') as StructureLink
          if (link && (link.energy > 0)) {
            if (this.withdraw(link, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
              this.moveTo(link)
              return
            }
          }
        }
        else if (this.room.name == 'W48S39') {
          const link = Game.getObjectById('5b0a2b654e8c62672f3191fb') as StructureLink
          if (link && (link.energy > 0)) {
            if (this.withdraw(link, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
              this.moveTo(link)
              return
            }
          }
        }

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

    if ((this.memory.status == CreepStatus.UPGRADE) && (((Game.time - this.memory.birth_time) % 5) == 0)) {
      this.memory.status = CreepStatus.CHARGE
    }

    // Charge
    if (this.memory.status == CreepStatus.CHARGE) {
      const target = this.pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: structure => {
          return ((structure.structureType == STRUCTURE_EXTENSION) && (structure.energy < structure.energyCapacity))
                  || ((structure.structureType == STRUCTURE_SPAWN) && (structure.energy < structure.energyCapacity - 50))
                  || ((structure.structureType == STRUCTURE_TOWER) && (structure.energy < structure.energyCapacity - 50))
                  || ((structure.structureType == STRUCTURE_TERMINAL) && (structure.store.energy < 100000) && !(!structure.room.storage) && (structure.room.storage.store.energy > 20000))
        }
      })

      if (!target) {
        if (this.memory.type != CreepType.CARRIER) {
          this.memory.status = CreepStatus.BUILD
        }
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
      if (this.room.attacked) {
        this.memory.status = CreepStatus.CHARGE
        return
      }

      const target = this.pos.findClosestByPath(FIND_CONSTRUCTION_SITES, {
        filter: (site) => site.my
      })


      let should_upgrade = true
      if (['W48S47', 'W49S47', 'W44S42'].indexOf(this.room.name) >= 0) {
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
      }

      if (!target) {
        if (should_upgrade) {
          this.memory.status = CreepStatus.UPGRADE
        }
        else {
          this.memory.status = CreepStatus.CHARGE
        }
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
      else if (this.room.attacked) {
        this.memory.status = CreepStatus.CHARGE
        return
      }
      else if (this.room.storage && ((this.room.storage.store.energy + (this.room.terminal || {store: {energy: 0}}).store.energy) < 20000) && (this.room.controller) && (this.room.controller.ticksToDowngrade > 30000)) {
        this.memory.status = CreepStatus.CHARGE
        return
      }
      else {
        this.upgradeController(room.controller!)
        this.moveTo(room.controller!)
        return
      }
    }
  }

  Creep.prototype.searchAndDestroy = function(no_move?: boolean): ActionResult {
    if ((this.getActiveBodyparts(ATTACK) + this.getActiveBodyparts(RANGED_ATTACK)) == 0) {
      console.log(`searchAndDestroy no attacker body parts ${this.name}`)
      return ActionResult.DONE
    }

    const hostile_attacker: Creep = this.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
      filter: (creep) => {
        return creep.body.filter((body: BodyPartDefinition) => {
          return (body.type == ATTACK) || (body.type == RANGED_ATTACK) || (body.type == HEAL)
        }).length > 0
      }
    })
    if (hostile_attacker) {
      return this.destroy(hostile_attacker)
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

    const hostile_creep: Creep = this.pos.findClosestByPath(FIND_HOSTILE_CREEPS)
    if (hostile_creep) {
      return this.destroy(hostile_creep)
    }

    // @todo:
    // const hostile_structure: AnyOwnedStructure = this.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
    //   filter: (structure) => {
    //     return [
    //       STRUCTURE_CONTROLLER,
    //       STRUCTURE_RAMPART,
    //       STRUCTURE_CONTAINER,
    //       STRUCTURE_LINK,
    //       STRUCTURE_EXTRACTOR,
    //       STRUCTURE_EXTENSION,
    //       STRUCTURE_LAB
    //     ].indexOf(structure.structureType) < 0
    //   }
    // })
    // if (hostile_structure) {
    //   return this.destroy(hostile_structure)
    // }

    console.log('searchAndDestroy done')
    return ActionResult.DONE
  }

  Creep.prototype.destroy = function(target: Creep | Structure, no_move?: boolean): ActionResult {
    if (this.spawning) {
      return ActionResult.IN_PROGRESS
    }

    const ranged_attack_result = this.rangedAttack(target) // @todo: If target only has ATTACK, run and rangedAttack
    const move_to_result = no_move ? OK : this.moveTo(target)
    const attack_result = this.attack(target)

    if ((ranged_attack_result != OK) || (move_to_result != OK) || (attack_result != OK)) {
      console.log(`Creep.destroy action failed ${ranged_attack_result}, ${move_to_result}, ${attack_result}, ${this.name}`)
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
