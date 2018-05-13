import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export interface RaiderTarget {
  readonly id: string
  readonly lair_id: string
  readonly room_name: string
}

export class RaiderSquad extends Squad {
  private max_energy = 2200

  constructor(readonly name: string, readonly source_info: RaiderTarget) {
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
    // energyAvailable = Math.min(energyAvailable, this.max_energy)

    // const front_part: BodyPartConstant[] = [TOUGH, TOUGH, MOVE]
    // const move: BodyPartConstant[] = [MOVE, MOVE]
    // const attack: BodyPartConstant[] = [RANGED_ATTACK, ATTACK]

    // const name = this.generateNewName()
    // let body: BodyPartConstant[] = []
    // const memory: CreepMemory = {
    //   squad_name: this.name,
    //   status: CreepStatus.NONE,
    //   birth_time: Game.time,
    //   type: CreepType.ATTACKER,
    // }

    // energyAvailable -= this.fix_part_energy

    // while(energyAvailable >= this.energy_unit) {
    //   body = move.concat(body)
    //   body = body.concat(attack)

    //   energyAvailable -= this.energy_unit
    // }
    // body = front_part.concat(body)
    // body.push(MOVE)

    // const result = spawnFunc(body, name, {
    //   memory: memory
    // })
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
