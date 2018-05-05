import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

class AttackerSquad extends Squad {
  private attacker: Creep | undefined
  private healer: Creep | undefined

  constructor(readonly name: string) {
    super(name)
  }

  public get type(): SquadType {
    return SquadType.ATTACKER
  }

  public static generateNewName(): string {
    return `${SquadType.ATTACKER}${Game.time}`
  }

  public generateNewName(): string {
    return AttackerSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    return SpawnPriority.NONE // @todo:
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    return false // @todo:
  }

  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    // @todo:
  }

  public run(): void {
    // @todo:
  }

  // -- Private --
  private suicide(): void {
    // @todo:
  }

  private addAttacker(spawnFunc: SpawnFunction) {
    // @todo:
  }

  private addHealer(spawnFunc: SpawnFunction) {
    // @todo:
  }
}
