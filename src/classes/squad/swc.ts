import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export class SWCSquad extends Squad {
  constructor(readonly name: string, readonly original_room_name: string) {
    super(name)
  }

  public get type(): SquadType {
    return SquadType.SWC
  }

  public get spawnPriority(): SpawnPriority {
    // return this.creeps.size < 1 ? SpawnPriority.URGENT : SpawnPriority.NONE

    return SpawnPriority.NONE
  }

  public static generateNewName(): string {
    return UID(SquadType.SWC)
  }

  public generateNewName(): string {
    return SWCSquad.generateNewName()
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    return energyAvailable >= 650
  }

  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    // const body: BodyPartConstant[] = [MOVE, CLAIM]
    const body: BodyPartConstant[] = [TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK]
    const name = this.generateNewName()
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.CLAIMER,
      let_thy_die: true,
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  public run(): void {
    this.creeps.forEach((creep) => {
      creep.claim('E17S17', true)
    })
  }

  public description(): string {
    const addition = this.creeps.size > 0 ? `, ${Array.from(this.creeps.values())[0].pos}` : ''
    return `${super.description()} ${addition}`
  }


  // --- Private ---
}
