import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export interface RemoteDefenderSqauadMemory extends SquadMemory {
  readonly room_names: string[]
}

export class RemoteDefenderSqauad extends Squad {
  constructor(readonly name: string) {
    super(name)
  }

  public get type(): SquadType {
    return SquadType.REMOTE_DEFENDER
  }

  public static generateNewName(): string {
    return UID(SquadType.REMOTE_DEFENDER)
  }

  public generateNewName(): string {
    return RemoteDefenderSqauad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    const memory = Memory.squads[this.name]
    if (memory.stop_spawming) {
      return SpawnPriority.NONE
    }

    return this.creeps.size < 1 ? SpawnPriority.URGENT : SpawnPriority.NONE
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    return energy_available >= 4040
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    const body: BodyPartConstant[] = [
      TOUGH, TOUGH, TOUGH, TOUGH,
      MOVE, MOVE, MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE, MOVE,
      RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
      RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
      MOVE, MOVE, MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE,
      MOVE,
      HEAL, HEAL, HEAL, HEAL, HEAL,
      HEAL,
    ]

    this.addGeneralCreep(spawn_func, body, CreepType.RANGED_ATTACKER)
  }

  public run(): void {
    this.creeps.forEach((creep) => {
      // @fixme:
      if (creep.moveToRoom('W44S6') == ActionResult.IN_PROGRESS) {
        return
      }

      creep.searchAndDestroy()
    })
  }

  public description(): string {
    const creep = Array.from(this.creeps.values())[0]
    const detail = !(!creep) ? `, ${creep.pos}` : ''
    return `${super.description()}${detail}`
  }
}
