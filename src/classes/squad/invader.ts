import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

interface InvaderMemory extends CreepMemory {
  target_id?: string
  target_x?: number
  target_y?: number
  is_leader?: boolean
}

interface InvaderSquadMemory extends SquadMemory {
  target_room_names?: string[]
  current_room_index?: number
  stop_spawning?: boolean
  max?: number
  ignore_rooms: string[]
  target_id?: string
  attacker?: boolean
}

export class InvaderSquad extends Squad {
  private target_room_names: string[]
  private current_room_index: number
  private current_target_room: string
  private leader: Creep | undefined
  // private followers: Creep[]

  constructor(readonly name: string, readonly base_room_name: string) {
    super(name)

    const memory = (Memory.squads[this.name] as InvaderSquadMemory)
    this.target_room_names = memory.target_room_names || ['W47S42']
    this.current_room_index = memory.current_room_index || 0
    this.current_target_room = this.target_room_names[this.current_room_index] || this.target_room_names[0] || 'W47S42'

    let max_hits = 0
    let max_hits_creep: Creep | undefined

    this.creeps.forEach((creep) => {
      const memory = creep.memory as InvaderMemory

      if (memory.is_leader) {
        this.leader = creep
      }
      else if (creep.hits > max_hits) {
        max_hits = creep.hits
        max_hits_creep = creep
      }
    })

    if (!this.leader && max_hits_creep) {
      (max_hits_creep.memory as InvaderMemory).is_leader = true
      this.leader = max_hits_creep
    }
    else if (this.leader && max_hits_creep && ((this.leader.hits + 300) < max_hits_creep.hits)) {
      (max_hits_creep.memory as InvaderMemory).is_leader = true
      this.leader = max_hits_creep
    }

    if (this.leader) {
      this.leader.memory.should_silent = false
    }

    this.creeps.forEach((creep) => {
      if (this.leader && (creep.id == this.leader.id)) {
        return
      }
      (creep.memory as InvaderMemory).is_leader = false
      creep.memory.should_silent = true
    })

    // this.followers = Array.from(this.creeps.values()).filter(c=>(!(c.memory as InvaderMemory).is_leader))
  }

  public get type(): SquadType {
    return SquadType.INVADER
  }

  public static generateNewName(): string {
    // return UID(SquadType.INVADER)
    return UID('Creep')
  }

  public generateNewName(): string {
    return InvaderSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    const memory = Memory.squads[this.name] as InvaderSquadMemory
    if (memory.stop_spawning) {
      return SpawnPriority.NONE
    }

    const room = Game.rooms[this.base_room_name]
    let max = memory.max || 1 // もし複数Creepを運用するとcurrent_target_room如何では遅れてきたfollowerが敵ルームに侵入する可能性がある

    // if (memory.target_room_name == 'W47S42') {
    //   max = 1
    // }

    if (!room || !room.storage || !room.terminal) {
      return SpawnPriority.NONE
    }

    if ((room.terminal.store[RESOURCE_KEANIUM_ALKALIDE] || 0) < 4000) {
      console.log(`InvaderSquad.spawnPriority lack of boost ${RESOURCE_KEANIUM_ALKALIDE}`)
      return SpawnPriority.NONE
    }

    switch (this.base_room_name) {
      case 'W48S47':
        break

      default:
        return SpawnPriority.NONE
    }

    const energy = room.storage.store.energy + room.terminal.store.energy

    if (energy < 20000) {
      console.log(`InvaderSquad.spawnPriority lack of energy ${energy}`)
      return SpawnPriority.NONE
    }

    // if ((this.creeps.size < max) && (this.creeps.size > 0)) {
    //   if (((Array.from(this.creeps.values())[0].ticksToLive || 1500) > 1400)) {
    //     return SpawnPriority.URGENT
    //   }
    //   else {
    //     return SpawnPriority.NONE
    //   }
    // }

    const creeps_about_to_die = Array.from(this.creeps.values()).filter((creep) => {
      if (creep.spawning) {
        return false
      }
      if ((creep.ticksToLive || 1500) < 350) {
        return true
      }
      return false
    }).length

    return this.creeps.size < (max + creeps_about_to_die) ? SpawnPriority.LOW : SpawnPriority.NONE
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    const memory = Memory.squads[this.name] as InvaderSquadMemory

    if (memory.attacker) {
      return energy_available >= 3250
    }
    else {
      return energy_available >= 4180
    }
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    const memory = Memory.squads[this.name] as InvaderSquadMemory

    if (memory.attacker) {
      this.addAttacker(energy_available, spawn_func)
    }
    else {
      this.addRangedAttacker(energy_available, spawn_func)
    }
  }

  public run(): void {
    // if (!this.leader) {
    //   return
    // }

    const ra_lab = Game.getObjectById('5b22b58d31be7d52a5ddb788') as StructureLab | undefined
    const a_lab = Game.getObjectById('5b22b94cb516ea5f55225541') as StructureLab | undefined

    // if (this.leader.hits < 2000) {
    //   this.leader.moveToRoom('W48S47')
    //   this.leader.heal(this.leader)
    //   return
    // }

    // const should_boost = false

    // // --- Leader
    // if (should_boost && lab && (this.leader.room.name == lab.room.name) && (lab.mineralAmount >= 300) && !this.leader.boosted) {
    //   if (lab.boostCreep(this.leader) == ERR_NOT_IN_RANGE) {
    //     this.leader.moveTo(lab)
    //   }
    // }
    // else if (this.leader.room.controller && this.leader.room.controller.owner && !this.leader.room.controller.my) {
    //   // When accidentaly entered an enemy room
    //   this.leader.heal(this.leader)
    //   const exit = this.leader.pos.findClosestByPath(FIND_EXIT)

    //   if (exit) {
    //     this.leader.moveTo(exit)
    //   }
    //   else {
    //     this.leader.moveToRoom(this.current_target_room)
    //   }
    // }
    // else {
    //   const hostile_creep = this.leader.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
    //     filter: (creep) => {
    //       if (creep.owner.username == 'Source Keeper') {
    //         return false
    //       }
    //       return true
    //     }
    //   })

    //   if (hostile_creep) {
    //     const number_of_hostiles = hostile_creep.pos.findInRange(FIND_HOSTILE_CREEPS, 10, {
    //       filter: (creep: Creep) => {
    //         if (creep.owner.username == 'Source Keeper') {
    //           return false
    //         }
    //         if ((creep.getActiveBodyparts(ATTACK) + creep.getActiveBodyparts(RANGED_ATTACK)) > 5) {
    //           return true
    //         }
    //         return false
    //       }
    //     }).length

    //     if (number_of_hostiles > 3) {
    //       const goal: {pos: RoomPosition, range: number} = {
    //         pos: hostile_creep.pos,
    //         range: 50,
    //       }

    //       const path: PathFinderPath = PathFinder.search(this.leader.pos, goal, {
    //         flee: true,
    //         maxRooms: 2,
    //       })

    //       if (path.path.length > 0) {
    //         this.say(`FLEEp`)

    //         this.leader.searchAndDestroyTo(this.current_target_room, false, {no_move: true})
    //         this.leader.moveByPath(path.path)
    //         return
    //       }
    //     }
    //   }
    //   this.leader.searchAndDestroyTo(this.current_target_room, true)
    // }

    // // --- Follower
    // this.followers.forEach((creep) => {
    //   if (lab && (creep.room.name == lab.room.name) && (lab.mineralAmount >= 300) && !creep.boosted) {
    //     if (lab.boostCreep(creep) == ERR_NOT_IN_RANGE) {
    //       creep.moveTo(lab)
    //     }
    //     return
    //   }
    //   else if (creep.room.controller && creep.room.controller.owner) {
    //     creep.heal(creep)
    //     creep.moveToRoom(this.current_target_room)
    //     return
    //   }

    //   creep.searchAndDestroy({no_move: true})
    //   creep.moveTo(this.leader!)
    // })

    const memory = Memory.squads[this.name] as InvaderSquadMemory
    let target_id: string | undefined
    let ignore_room_passed = true

    if (memory.target_id && Game.getObjectById(target_id)) {
      target_id = memory.target_id
    }

    this.creeps.forEach((creep) => {
      if (memory.attacker) {
        if (a_lab && (creep.room.name == a_lab.room.name) && (a_lab.mineralAmount >= 750) && !creep.boosted) {
          if (a_lab.boostCreep(creep) == ERR_NOT_IN_RANGE) {
            creep.moveTo(a_lab)
          }
          return
        }
      }
      else {
        if (ra_lab && (creep.room.name == ra_lab.room.name) && (ra_lab.mineralAmount >= 300) && !creep.boosted) {
          if (ra_lab.boostCreep(creep) == ERR_NOT_IN_RANGE) {
            creep.moveTo(ra_lab)
          }
          return
        }
      }

      if (creep.room.controller && creep.room.controller.owner && !creep.room.controller.my) {
        // When accidentaly entered an enemy room
        creep.heal(creep)
        const exit = creep.pos.findClosestByPath(FIND_EXIT)

        if (exit) {
          creep.moveTo(exit)
        }
        else {
          creep.moveToRoom(this.current_target_room)
        }
        return
      }

      if (memory.ignore_rooms && (memory.ignore_rooms.indexOf(creep.room.name) >= 0)) {
        ignore_room_passed = false
        creep.moveToRoom(this.current_target_room)
        return
      }

      if ((this.current_target_room == 'W49S47') && (creep.room.name == 'W49S48')) {
        creep.moveToRoom(this.current_target_room)
        return
      }

      if (memory.attacker) {
        if (creep.moveToRoom(this.current_target_room) == ActionResult.IN_PROGRESS) {
          return
        }
      }

      if (!target_id) {
        let target: Creep | undefined
        target = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
          filter: (creep) => {
            if (creep.owner.username == 'Source Keeper') {
              return false
            }
            if (creep.hits < creep.hitsMax) {
              return true
            }
            return false
          }
        })

        if (target) {
          target_id = target.id
        }
        else {
          target = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
            filter: (creep) => {
              if (creep.owner.username == 'Source Keeper') {
                return false
              }
              if (creep.hits < creep.hitsMax) {
                return true
              }
              return false
            }
          })

          if (target) {
            target_id = target.id
          }
        }
      }

      if (target_id) {
        (creep.memory as {target_id?: string}).target_id = target_id
      }

      if ((creep.room.attacker_info.hostile_creeps.length > this.creeps.size) && (creep.room.name == 'W47S47') && (creep.hits < (creep.hitsMax - 1000))) {
        creep.heal(creep)
        const exit = creep.pos.findClosestByPath(FIND_EXIT)

        if (exit) {
          creep.moveTo(exit)
        }
        else {
          creep.searchAndDestroyTo('W48S47', false, {no_move: true, ignore_source_keeper: true})
        }
        return
      }

      if (creep.room.name != this.current_target_room) {
        const is_leader = !(!this.leader) && (this.leader.id == creep.id)
        creep.searchAndDestroyTo(this.current_target_room, true, {no_move: !is_leader, ignore_source_keeper: true})

        if (!is_leader && this.leader) {
          creep.moveTo(this.leader)
        }
        return
      }

      let no_move = false

      if (!target_id && (creep.room.name == this.current_target_room)) {
        if (this.current_target_room == 'W49S48') {
          creep.moveTo(2, 5)
          no_move = true
        }
        else if (this.current_target_room == 'W49S47') {
          creep.moveTo(14, 22)
          no_move = true
        }
      }

      if (memory.attacker && (creep.hits < (creep.hitsMax - 1000))) {
        no_move = true
      }

      creep.searchAndDestroy({ignore_source_keeper: true, no_move: no_move, max_room: 1})
    });

    if (ignore_room_passed) {
      (Memory.squads[this.name] as InvaderSquadMemory).ignore_rooms = []
    }
  }

  public description(): string {
    const additions = ""//!this.leader ? "" : `, ${this.leader.pos}`
    return `${super.description()}${additions}`
  }

  // --- Private ---
  private addRangedAttacker(energyAvailable: number, spawnFunc: SpawnFunction): void {
    // 4180

    const is_leader = false//!this.leader

    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      TOUGH, TOUGH, TOUGH, TOUGH,
      RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE,
      HEAL, MOVE, HEAL, MOVE,
      HEAL, MOVE, HEAL, MOVE,
      HEAL, MOVE,
      MOVE, MOVE, MOVE, MOVE,
      MOVE, HEAL,
    ]
    const memory: InvaderMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.ATTACKER,
      should_notify_attack: false,
      let_thy_die: true,
      is_leader: is_leader
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  private addAttacker(energyAvailable: number, spawnFunc: SpawnFunction): void {
    // 3250

    const is_leader = false//!this.leader

    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE,
      ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE,
      ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE,
      ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE,
      ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE,
    ]
    const memory: InvaderMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.ATTACKER,
      should_notify_attack: false,
      let_thy_die: true,
      is_leader: is_leader
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  private addHealer(energy_available: number, spawn_func: SpawnFunction) {
    const name = this.generateNewName()
    let body: BodyPartConstant[] = []

    if (energy_available >= 5280) {
      body = [
        TOUGH, TOUGH, TOUGH,
        MOVE, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE,
        MOVE,
        HEAL, HEAL, HEAL, HEAL, HEAL,
        HEAL, HEAL, HEAL, HEAL, HEAL,
        HEAL, HEAL, HEAL, HEAL, HEAL,
        HEAL, HEAL,
        MOVE,
      ]
    }
    else {
      body = [
        TOUGH, TOUGH, TOUGH,
        MOVE, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
        RANGED_ATTACK,
        HEAL, HEAL, HEAL, HEAL, HEAL, HEAL,
        MOVE,
      ]
    }

    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.HEALER,
      should_notify_attack: false,
      let_thy_die: true,
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  private recycle(): void {
    this.creeps.forEach((creep) => {
      if (creep.moveToRoom(this.base_room_name) == ActionResult.IN_PROGRESS) {
        return
      }
      const spawn = creep.room.spawns[0]
      if (!spawn) {
        console.log(`InvaderSpawn.recycle no spawn found in room ${creep.room.name}, ${this.name}, ${creep.pos}`)
        return
      }

      if (spawn.spawning) {
        creep.moveTo(spawn)
        return
      }
      if (spawn.recycleCreep(creep) == ERR_NOT_IN_RANGE) {
        creep.moveTo(spawn)
      }
    })
  }

  private moveToOutpost(): void {
    this.creeps.forEach((creep) => {
      creep.heal(creep)

      if (creep.moveToRoom('W44S42') == ActionResult.IN_PROGRESS) {
        return
      }

      if (creep.boosted) {
        console.log(`InvaderSquad.moveToOutpost do NOT renew boosted creep ${creep.name}, ${this.name}, at ${creep.pos}`)
        return
      }

      if ((creep.ticksToLive || 0) > 1450) {
        creep.memory.status = CreepStatus.NONE
      }

      if ((creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || ((creep.ticksToLive || 0) < 1400)) {
        creep.memory.let_thy_die = false
        creep.goToRenew(creep.room.spawns[0])
      }
      else {
        creep.memory.status = CreepStatus.NONE

        creep.moveTo(12, 12)
        creep.say("😴")
      }
    })
  }

  // private runAttacker() {
  //   // if healer is not beside, stop
  //   // if target, attack
  //   // if no target, search and destroy


  //   if (!this.attacker) {
  //     return
  //   }

  //   let should_stop = false
  //   if ((this.attacker.room.name != this.base_room_name) && this.healer && (this.healer.pos.getRangeTo(this.attacker) > 1)) {
  //     should_stop = true
  //   }

  //   if (this.attacker.moveToRoom(this.target_room_name) == ActionResult.IN_PROGRESS) {
  //     return
  //   }

  //   if (this.target) {
  //     this.attacker.destroy(this.target)
  //   }
  //   else {
  //     const memory = this.attacker.memory as InvaderMemory
  //     if (memory.target_x && memory.target_y) {
  //       this.attacker.moveTo(memory.target_x, memory.target_y)
  //       this.attacker.heal(this.attacker)
  //     }
  //     else {
  //       this.attacker.searchAndDestroy()
  //     }
  //   }
  // }

  // private runHealer() {
  //   // follow attacker
  //   // heal attacker or self
  //   // ranged attack if enemy nearby

  //   if (!this.healer) {
  //     return
  //   }
  //   if (!this.attacker) {
  //     this.healer.moveToRoom(this.base_room_name)
  //     return
  //   }

  //   this.healer.moveTo(this.attacker)

  //   const attacker_hit_lack = this.attacker.hitsMax - this.attacker.hits
  //   const healer_hit_lack = this.healer.hitsMax - this.healer.hits
  //   const heal_target = attacker_hit_lack < healer_hit_lack ? this.healer : this.attacker

  //   const heal_result = this.healer.heal(heal_target)

  //   switch (heal_result) {
  //     case OK:
  //       break

  //     case ERR_NOT_IN_RANGE:
  //     default:
  //       this.healer.rangedHeal(heal_target)
  //       console.log(`InvaderSquad.runHealer heal failed with ${heal_result}, ${this.name}, ${this.healer.pos}`)
  //       break
  //   }

  //   if ((this.target && (this.healer.rangedAttack(this.target) == ERR_NOT_IN_RANGE)) || !this.target) {
  //     let target: Creep | Structure | undefined = this.healer.pos.findInRange(FIND_HOSTILE_CREEPS, 3)[0]
  //     if (!target) {
  //       this.healer.pos.findInRange(FIND_STRUCTURES, 3, {
  //         filter: (structure: Structure) => {
  //           if ((structure as AnyOwnedStructure).my) {
  //             return !(structure as AnyOwnedStructure).my
  //           }
  //           return true
  //         }
  //       })[0]
  //     }
  //     if (target) {
  //       this.healer.rangedAttack(target)
  //     }
  //   }
  // }
}
