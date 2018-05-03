import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, CreepActionResult } from "classes/creep"

export class HarvesterSquad extends Squad {
  constructor(readonly name: string) {
    super(name)
  }

  public get type(): SquadType {
    return SquadType.HARVESTER
  }

  public static generateNewName(): string {
    return `${SquadType.HARVESTER}${Game.time}`
  }

  public generateNewName(): string {
    return HarvesterSquad.generateNewName()
  }

  public get spawnPriority(): SpawnPriority {
    return SpawnPriority.NONE // @todo:
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    return false // @todo:
  }

  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {

  }

  public run(): void {

  }
}
