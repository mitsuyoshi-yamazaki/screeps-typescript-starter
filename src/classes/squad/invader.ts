import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

interface InvaderMemory extends CreepMemory {
  target_id?: string
  target_x?: number
  target_y?: number
}

export class InvaderSquad extends Squad {
  private attacker: Creep | undefined
  private healer: Creep | undefined
  private target: Creep | Structure | undefined

  constructor(readonly name: string, readonly base_room_name: string, readonly target_room_name: string) {
    super(name)

    this.creeps.forEach((creep) => {
      switch (creep.memory.type) {
        case CreepType.ATTACKER:
          this.attacker = creep
          break

        case CreepType.HEALER:
          this.healer = creep
          break

        default:
          console.log(`InvaderSquad unexpectedly found ${creep.memory.type} ${creep.name}, ${this.name}`)
          break
      }
    })

    if (this.attacker) {
      const memory = this.attacker.memory as InvaderMemory
      if (memory.target_id) {
        this.target = Game.getObjectById(memory.target_id) as Creep | Structure | undefined
      }
    }
  }

  public get type(): SquadType {
    return SquadType.INVADER
  }

  public static generateNewName(): string {
    return UID(SquadType.INVADER)
  }

  public generateNewName(): string {
    return InvaderSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    // if (!this.attacker || !this.healer) {
    //   return SpawnPriority.URGENT
    // }
    return SpawnPriority.NONE
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    if (capacity > 2200) {
      if (!this.attacker) {
        return energy_available >= 2610
      }
      if (!this.healer) {
        return energy_available >= 5280
      }
      return false
    }
    else {
      if (!this.attacker) {
        return energy_available >= 2040
      }
      if (!this.healer) {
        return energy_available >= 2180
      }
      return false
    }
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    if (!this.attacker) {
      this.addAttacker(energy_available, spawn_func)
      return
    }
    if (!this.healer) {
      this.addHealer(energy_available, spawn_func)
      return
    }
  }

  public run(): void {
    this.creeps.forEach((creep) => {
      creep.memory.let_thy_die = true
    })

    // if (this.attacker) {
    //   this.attacker.moveTo(16, 24)
    // }
    // if (this.healer) {
    //   this.healer.moveTo(17, 24)
    // }



    // this.runAttacker()
    // this.runHealer()


    this.recycle()
    // this.returnToBase()
    // this.moveToOutpost()
  }

  // --- Private ---
  private addAttacker(energy_available: number, spawn_func: SpawnFunction) {
    const name = this.generateNewName()
    let body: BodyPartConstant[] = []

    if (energy_available >= 2610) {
      body = [
        TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
        MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE,
        ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
        ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
        ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
        MOVE, HEAL,
      ]
    }
    else {
      body = [
        TOUGH, TOUGH, TOUGH,
        MOVE, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
        ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
        MOVE, HEAL,
      ]
    }

    const memory: InvaderMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.ATTACKER,
      let_thy_die: true,
    }

    const result = spawn_func(body, name, {
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
      let_thy_die: true,
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  private returnToBase(): void {
    this.creeps.forEach((creep) => {
      // creep.moveToRoom(this.base_room_name)
      creep.moveToRoom('W44S42')
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

  private runAttacker() {
    // if healer is not beside, stop
    // if target, attack
    // if no target, search and destroy


    if (!this.attacker) {
      return
    }

    let should_stop = false
    if ((this.attacker.room.name != this.base_room_name) && this.healer && (this.healer.pos.getRangeTo(this.attacker) > 1)) {
      should_stop = true
    }

    if (this.attacker.moveToRoom(this.target_room_name) == ActionResult.IN_PROGRESS) {
      return
    }

    if (this.target) {
      this.attacker.destroy(this.target)
    }
    else {
      const memory = this.attacker.memory as InvaderMemory
      if (memory.target_x && memory.target_y) {
        this.attacker.moveTo(memory.target_x, memory.target_y)
        this.attacker.heal(this.attacker)
      }
      else {
        this.attacker.searchAndDestroy()
      }
    }
  }

  private runHealer() {
    // follow attacker
    // heal attacker or self
    // ranged attack if enemy nearby

    if (!this.healer) {
      return
    }
    if (!this.attacker) {
      this.healer.moveToRoom(this.base_room_name)
      return
    }

    this.healer.moveTo(this.attacker)

    const attacker_hit_lack = this.attacker.hitsMax - this.attacker.hits
    const healer_hit_lack = this.healer.hitsMax - this.healer.hits
    const heal_target = attacker_hit_lack < healer_hit_lack ? this.healer : this.attacker

    const heal_result = this.healer.heal(heal_target)

    switch (heal_result) {
      case OK:
        break

      case ERR_NOT_IN_RANGE:
      default:
        this.healer.rangedHeal(heal_target)
        console.log(`InvaderSquad.runHealer heal failed with ${heal_result}, ${this.name}, ${this.healer.pos}`)
        break
    }

    if ((this.target && (this.healer.rangedAttack(this.target) == ERR_NOT_IN_RANGE)) || !this.target) {
      let target: Creep | Structure | undefined = this.healer.pos.findInRange(FIND_HOSTILE_CREEPS, 3)[0]
      if (!target) {
        this.healer.pos.findInRange(FIND_STRUCTURES, 3, {
          filter: (structure: Structure) => {
            if ((structure as AnyOwnedStructure).my) {
              return !(structure as AnyOwnedStructure).my
            }
            return true
          }
        })[0]
      }
      if (target) {
        this.healer.rangedAttack(target)
      }
    }
  }
}
