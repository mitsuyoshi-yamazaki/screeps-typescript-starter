import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export class ChargerSquad extends Squad {
  constructor(readonly name: string, readonly room_name: string, readonly link: StructureLink | undefined, readonly creep_position: {x: number, y: number}) {
    super(name)
  }

  public get type(): SquadType {
    return SquadType.CHARGER
  }

  public static generateNewName(): string {
    return UID(SquadType.CHARGER)
  }

  public generateNewName(): string {
    return ChargerSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    return this.creeps.size < 1 ? SpawnPriority.HIGH : SpawnPriority.NONE
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    return energy_available >= 150
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    this.addGeneralCreep(spawn_func, [MOVE, CARRY, CARRY], CreepType.CARRIER)
  }

  public run(): void {
    this.creeps.forEach((creep) => {
      creep.transferLinkToStorage(this.link, this.creep_position)
    })
  }
}
