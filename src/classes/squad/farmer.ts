import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"


export class FarmerSquad extends Squad {
  private upgraders: Creep[] = []
  private carriers: Creep[] = []
  private builders: Creep[] = []

  constructor(readonly name: string, readonly room_name: string) {
    super(name)
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
