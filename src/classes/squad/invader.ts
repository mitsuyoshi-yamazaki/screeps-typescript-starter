import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

interface InvaderMemory extends CreepMemory {
  target_id?: string
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
    if (!this.attacker || !this.healer) {
      return SpawnPriority.URGENT
    }
    return SpawnPriority.NONE
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    if (!this.attacker) {
      return energy_available >= 2040
    }
    if (!this.healer) {
      return energy_available >= 2180
    }
    return false
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    if (!this.attacker) {
      this.addAttacker(spawn_func)
      return
    }
    if (!this.healer) {
      this.addHealer(spawn_func)
      return
    }
  }

  public run(): void {
    this.creeps.forEach((creep) => {
      creep.moveTo(17, 24)
    })

    // this.runAttacker()
    // this.runHealer()
  }

  // --- Private ---
  private addAttacker(spawn_func: SpawnFunction) {
    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      TOUGH, TOUGH, TOUGH,
      MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
      ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
      MOVE, HEAL,
    ]
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

  private addHealer(spawn_func: SpawnFunction) {
    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      TOUGH, TOUGH, TOUGH,
      MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
      RANGED_ATTACK,
      HEAL, HEAL, HEAL, HEAL, HEAL, HEAL,
      MOVE,
    ]
    const memory: CreepMemory = {
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
      this.attacker.searchAndDestroy()
    }
    this.attacker.heal(this.attacker)
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
        console.log(`Manual.runHealer heal failed with ${heal_result}, ${this.name}, ${this.healer.pos}`)
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
