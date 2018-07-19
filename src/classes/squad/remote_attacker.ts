import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"


export class RemoteAttackerSquad extends Squad {
  private boost_lab_ids = new Map<ResourceConstant, string>()
  private boost_labs = new Map<ResourceConstant, StructureLab>()

  constructor(readonly name: string, readonly base_room: Room, readonly target_room: string) {
    super(name)

    if (this.base_room.name == 'W47N2') {
      // this.boost_lab_ids.set()
    }
  }

  public get type(): SquadType {
    return SquadType.REMOTE_ATTACKER
  }

  public static generateNewName(): string {
    return UID('RA')
  }

  public generateNewName(): string {
    return RemoteAttackerSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    const hostile_creeps = this.base_room.attacker_info.hostile_creeps.filter((creep) => {
      return creep.owner.username == 'x3mka'
    })

    if (hostile_creeps.length == 0) {
      if (['W47N2', 'W43N5'].indexOf(this.base_room.name) >= 0) {
        return this.creeps.size < 2 ? SpawnPriority.LOW : SpawnPriority.NONE
      }
      return SpawnPriority.NONE
    }

    return this.creeps.size < 5 ? SpawnPriority.URGENT : SpawnPriority.NONE
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    return energy_available >= 3820
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    this.addAttacker(energy_available, spawn_func)
  }

  public run(): void {
    this.creeps.forEach((creep) => {
      if (creep.searchAndDestroy() == ActionResult.DONE) {
        switch (this.base_room.name) {
          case 'W47N2':
            creep.moveTo(37, 9)
            break

          case 'W43N5':
            creep.moveTo(2, 25)
            break

          default:
            creep.moveTo(25, 25)
        }
      }
    })
  }

  // ----
  private addAttacker(energy_available: number, spawn_func: SpawnFunction): void {
    const body: BodyPartConstant[] = [
      TOUGH, TOUGH, TOUGH, TOUGH,
      MOVE, MOVE, MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE,
      ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
      ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
      ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
      ATTACK,
      MOVE,
      HEAL, HEAL, HEAL, HEAL, HEAL,
    ]
    this.addGeneralCreep(spawn_func, body, CreepType.ATTACKER)
  }
}
