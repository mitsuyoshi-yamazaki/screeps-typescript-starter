import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

interface InvaderMemory extends CreepMemory {
}

interface InvaderSquadMemory extends SquadMemory {
  target_room_names: string[]
  current_room_index: number
  target_id: string | null
}

export class InvaderSquad extends Squad {
  private target_room_names: string[]
  private current_room_index: number
  private current_target_room: string | undefined

  private leader: Creep | undefined
  private follower: Creep | undefined

  private next_creep: CreepType | undefined

  constructor(readonly name: string, readonly base_room: Room, region_name: string) {
    super(name)

    const squad_memory = (Memory.squads[this.name] as InvaderSquadMemory)
    if (squad_memory) {
      this.target_room_names = squad_memory.target_room_names || []
      this.current_room_index = squad_memory.current_room_index || 0
      this.current_target_room = this.target_room_names[this.current_room_index]
    }
    else {
      this.target_room_names = []
      this.current_room_index = 0
    }

    this.creeps.forEach((creep) => {
      switch (creep.memory.type) {
        case CreepType.WORKER:
          this.leader = creep
          break

        case CreepType.HEALER:
          this.follower = creep
          break

        default:
          console.log(`InvaderSquad unexpected creep type ${creep.memory.type}, ${this.name}, ${creep.pos}`)
          break
      }
    })

    this.set_next_creep()
  }

  private set_next_creep(): void {
    if (!this.leader) {
      this.next_creep = CreepType.WORKER
      return
    }

    if (!this.follower) {
      this.next_creep = CreepType.HEALER
      return
    }
  }

  public get type(): SquadType {
    return SquadType.INVADER
  }

  public static generateNewName(): string {
    // return UID(SquadType.INVADER)
    return UID('I')
  }

  public generateNewName(): string {
    return InvaderSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    switch (this.next_creep) {
      case CreepType.WORKER:
        return SpawnPriority.LOW

      case CreepType.HEALER:
        return SpawnPriority.URGENT
    }

    return SpawnPriority.NONE
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    // switch (this.next_creep) {
    //   case CreepType.WORKER:
    //     return

    //   case CreepType.HEALER:
    //     return
    // }

    return false
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    switch (this.next_creep) {
      case CreepType.WORKER:
        return

      case CreepType.HEALER:
        return
    }
  }

  public run(): void {
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
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.ATTACKER,
      should_notify_attack: false,
      let_thy_die: true,
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
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.ATTACKER,
      should_notify_attack: false,
      let_thy_die: true,
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
      if (creep.moveToRoom(this.base_room.name) == ActionResult.IN_PROGRESS) {
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

      if (creep.boosted()) {
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
