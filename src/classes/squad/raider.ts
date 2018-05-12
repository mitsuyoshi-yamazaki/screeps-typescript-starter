import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export class RaiderSquad extends Squad {
  constructor(readonly name: string, readonly source_info: {id: string, room_name: string}) {
    super(name)
  }

  public get type(): SquadType {
    return SquadType.RAIDER
  }

  public static generateNewName(): string {
    return UID(SquadType.RAIDER)
  }

  public generateNewName(): string {
    return RaiderSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    return SpawnPriority.NONE
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    return false
  }

  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    console.log(`RaiderSquad.addCreep not implemented yet ${this.name}`)
  }

  public run(): void {
    this.creeps.forEach((creep) => {
      if (creep.moveToRoom(this.source_info.room_name) == ActionResult.IN_PROGRESS) {
        creep.say(this.source_info.room_name)
        return
      }

      creep.searchAndDestroy()
      creep.say('ATTACK')
    })
  }
}
