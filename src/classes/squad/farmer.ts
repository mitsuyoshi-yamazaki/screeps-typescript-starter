import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"


export class FarmerSquad extends Squad {
  private upgraders: Creep[] = []
  private carriers: Creep[] = []
  private builders: Creep[] = []

  private next_creep: CreepType | undefined

  constructor(readonly name: string, readonly room_name: string) {
    super(name)

    this.creeps.forEach((creep) => {
      switch (creep.memory.type) {
        case CreepType.UPGRADER:
          this.upgraders.push(creep)
          break

        case CreepType.WORKER:
          this.builders.push(creep)
          break

        case CreepType.CARRIER:
          this.carriers.push(creep)
          break

        default:
          console.log(`FarmerSquad unexpected creep type ${creep.memory.type}, ${this.name}, ${creep.pos}`)
          break
      }
    })

    this.next_creep = this.nextCreep()
  }

  private nextCreep(): CreepType | undefined {
    const upgrader_max = 1
    if (this.upgraders.length < upgrader_max) {
      return CreepType.UPGRADER
    }

    const carrier_max = 4
    if (this.carriers.length < carrier_max) {
      return CreepType.CARRIER
    }

    return undefined
  }

  public get type(): SquadType {
    return SquadType.FARMER
  }

  public static generateNewName(): string {
    return UID(SquadType.FARMER)
  }

  public generateNewName(): string {
    return FarmerSquad.generateNewName()
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
}
