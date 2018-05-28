import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

/**
 * Not implemented
 */
export class BoostedUpgraderSquad extends Squad {
  constructor(readonly name: string, readonly room: Room) {
    super(name)

    this.creeps.forEach((creep) => {
      switch (creep.memory.type) {
        case CreepType.WORKER:
          this.upgrader = creep
          break

        case CreepType.CARRIER:
          this.carrier = creep
          break

        default:
          console.log(`BoostedUpgraderSquad unexpected creep type ${creep.memory.type} ${creep.name}, ${this.name}`)
          break
      }
    })
  }

  private upgrader: Creep | undefined
  private carrier: Creep | undefined

  public get type(): SquadType {
    return SquadType.BOOSTED_UPGRADER
  }

  public static generateNewName(): string {
    return UID(SquadType.BOOSTED_UPGRADER)
  }

  public generateNewName(): string {
    return BoostedUpgraderSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    let lab: StructureLab | undefined

    switch (this.room.name) {
      default:
        break
    }

    if (this.upgrader && !this.carrier) {
      return SpawnPriority.HIGH
    }

    const has_lab = !(!lab) && (lab.mineralType == RESOURCE_CATALYZED_GHODIUM_ACID) && (lab.mineralAmount >= 300)

    if (has_lab) {
      if (!this.upgrader) {
        return SpawnPriority.LOW
      }
    }

    return SpawnPriority.NONE
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    return false
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {

  }

  public run(): void {

  }
}
