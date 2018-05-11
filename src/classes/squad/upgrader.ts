import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export class UpgraderSquad extends Squad {
  constructor(readonly name: string, readonly room_name: string) {
    super(name)
  }

  public get type(): SquadType {
    return SquadType.UPGRADER
  }

  public static generateNewName(): string {
    return UID(SquadType.UPGRADER)
  }

  public generateNewName(): string {
    return UpgraderSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    if (this.room_name != 'W48S47') { // W48S47's upgrader will manually reassign to other rooms
      return SpawnPriority.NONE
    }
    return (this.creeps.size > 2) ? SpawnPriority.NORMAL : SpawnPriority.NONE
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    const energy_unit = 250
    const energyNeeded = (Math.floor(capacity / energy_unit) * energy_unit) + 150
    return energyAvailable >= energyNeeded
  }

  // --
  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    // capacity: 2300
    // 8 units, 2C, 16W, 9M

    const move: BodyPartConstant[] = [MOVE]
    const work: BodyPartConstant[] = [WORK, WORK]
    const energy_unit = 250

    energyAvailable -= 150
    const header: BodyPartConstant[] = [CARRY, CARRY]
    let body: BodyPartConstant[] = [MOVE]
    const name = this.generateNewName()
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.WORKER,
    }

    while (energyAvailable >= energy_unit) {
      body = move.concat(body)
      body = body.concat(work)
      energyAvailable -= energy_unit
    }
    body = header.concat(body)

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  public run(): void {
    this.creeps.forEach((creep) => {

    })
  }
}
