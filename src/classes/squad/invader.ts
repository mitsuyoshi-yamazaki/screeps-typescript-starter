import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

interface InvaderMemory extends CreepMemory {
  target_id?: string
  target_x?: number
  target_y?: number
  is_leader?: boolean
  target_room_name?: string
}

interface InvaderSquadMemory extends SquadMemory {
  target_room_name?: string
  stop_spawning?: boolean
}

export class InvaderSquad extends Squad {
  private target_room_name: string
  private leader: Creep | undefined
  private followers: Creep[]

  constructor(readonly name: string, readonly base_room_name: string) {
    super(name)

    const memory = (Memory.squads[this.name] as InvaderSquadMemory)
    this.target_room_name = memory.target_room_name || 'W47S42'

    let max_hits = 0
    let max_hits_creep: Creep | undefined

    this.creeps.forEach((creep) => {
      const memory = creep.memory as InvaderMemory

      if (!memory.target_room_name) {
        (creep.memory as InvaderMemory).target_room_name = this.target_room_name
      }

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

    this.followers = Array.from(this.creeps.values()).filter(c=>(!(c.memory as InvaderMemory).is_leader))
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
    let max = 1

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

    if (energy < 100000) {
      console.log(`InvaderSquad.spawnPriority lack of energy ${energy}`)
      return SpawnPriority.NONE
    }

    if ((this.creeps.size < max) && (this.creeps.size > 0)) {
      if (((Array.from(this.creeps.values())[0].ticksToLive || 1500) > 1400)) {
        return SpawnPriority.URGENT
      }
      else {
        return SpawnPriority.NONE
      }
    }

    return this.creeps.size < max ? SpawnPriority.LOW : SpawnPriority.NONE
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    return energy_available >= 4180
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    this.addAttacker(energy_available, spawn_func)
  }

  public run(): void {
    if (!this.leader) {
      return
    }

    const lab = Game.getObjectById('5b22b58d31be7d52a5ddb788') as StructureLab | undefined

    // if (this.leader.hits < 2000) {
    //   this.leader.moveToRoom('W48S47')
    //   this.leader.heal(this.leader)
    //   return
    // }

    const should_boost = true

    // --- Leader
    if (should_boost && lab && (this.leader.room.name == lab.room.name) && (lab.mineralAmount >= 300) && !this.leader.boosted) {
      if (lab.boostCreep(this.leader) == ERR_NOT_IN_RANGE) {
        this.leader.moveTo(lab)
      }
    }
    else if (this.leader.room.controller && this.leader.room.controller.owner) {
      this.leader.heal(this.leader)
      this.leader.moveToRoom(this.target_room_name)
    }
    else {
      const hostile_creep = this.leader.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
        filter: (creep) => {
          if (creep.owner.username == 'Source Keeper') {
            return false
          }
          return true
        }
      })

      if (hostile_creep) {
        const number_of_hostiles = hostile_creep.pos.findInRange(FIND_HOSTILE_CREEPS, 10, {
          filter: (creep: Creep) => {
            if (creep.owner.username == 'Source Keeper') {
              return false
            }
            if ((creep.getActiveBodyparts(ATTACK) + creep.getActiveBodyparts(RANGED_ATTACK)) > 5) {
              return true
            }
            return false
          }
        }).length

        if (number_of_hostiles > 3) {
          const goal: {pos: RoomPosition, range: number} = {
            pos: hostile_creep.pos,
            range: 50,
          }

          const path: PathFinderPath = PathFinder.search(this.leader.pos, goal, {
            flee: true,
            maxRooms: 2,
          })

          if (path.path.length > 0) {
            this.say(`FLEEp`)

            this.leader.searchAndDestroyTo(this.target_room_name, false, {no_move: true})
            this.leader.moveByPath(path.path)
            return
          }
        }
      }
      this.leader.searchAndDestroyTo(this.target_room_name, true)
    }

    // --- Follower
    this.followers.forEach((creep) => {
      if (lab && (creep.room.name == lab.room.name) && (lab.mineralAmount >= 300) && !creep.boosted) {
        if (lab.boostCreep(creep) == ERR_NOT_IN_RANGE) {
          creep.moveTo(lab)
        }
        return
      }
      else if (creep.room.controller && creep.room.controller.owner) {
        creep.heal(creep)
        creep.moveToRoom(this.target_room_name)
        return
      }

      creep.searchAndDestroy({no_move: true})
      creep.moveTo(this.leader!)
    })
  }

  public description(): string {
    const additions = !this.leader ? "" : `, ${this.leader.pos}`
    return `${super.description()}${additions}`
  }

  // --- Private ---
  private addAttacker(energyAvailable: number, spawnFunc: SpawnFunction): void {
    // 4180

    const is_leader = !this.leader

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
