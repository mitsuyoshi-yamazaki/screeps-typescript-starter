import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export class InvaderSquad extends Squad {
  private attacker: Creep | undefined
  private healer: Creep | undefined
  private target: Creep | Structure | undefined

  constructor(readonly name: string) {
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

    // this.target // todo
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
    return SpawnPriority.NONE
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    return false
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {

  }

  public run(): void {

  }

  // --- Private ---
  private addAttacker(spawn_func: SpawnFunction) {

  }

  private addHealer(spawn_func: SpawnFunction) {

  }

  private runAttacker() {

  }

  private runHealer() {
    // follow attacker
    // heal attacker or self
    // ranged attack if enemy nearby

    if (!this.healer) {
      return
    }
    if (!this.attacker) {
      // return to the base
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

    // if ((this.target && (this.healer.rangedAttack(this.target) == ERR_NOT_IN_RANGE)) || !this.target) {
    //   let target: Creep | Structure | undefined = this.healer.pos.findInRange(FIND_HOSTILE_CREEPS, 3)[0]
    //   if (!target) {
    //     this.healer.pos.findInRange(FIND_STRUCTURES, 3, {
    //       filter: (structure: Structure) => {
    //         return !(!structure.my) // fixme:
    //       }
    //     })[0]
    //   }
    //   if (target) {
    //     this.healer.rangedAttack(target)
    //   }
    // }
  }
}
