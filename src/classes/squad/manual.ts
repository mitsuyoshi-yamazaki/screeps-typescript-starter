import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, CreepActionResult } from "classes/creep"

export class ManualSquad extends Squad {
  constructor(readonly name: string, readonly original_room_name: string) {
    super(name)
  }

  public get type(): SquadType {
    return SquadType.MANUAL
  }

  public get spawnPriority(): SpawnPriority {
    const r = this.creeps.size < 1 ? SpawnPriority.NORMAL : SpawnPriority.NONE
    // console.log(`MaualSquad.spawnPriority ${r}`)

    // return r
    return SpawnPriority.NONE
  }

  public static generateNewName(): string {
    return `${SquadType.MANUAL}${Game.time}`
  }

  public generateNewName(): string {
    return ManualSquad.generateNewName()
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    return energyAvailable >= 650
  }

  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    const name = this.generateNewName()
    const body: BodyPartConstant[] = [ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE]
    const memory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })

    console.log(`Spawn [${body}] and assign to ${this.name}: ${result}`)
  }

  public run(): void {
    this.creeps.forEach((creep, _) => {
      const target_room_name = 'W46S46'

      if (creep.moveToRoom(target_room_name) != CreepActionResult.DONE) {
        return
      }

      const target = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS)

      if (target) {
        if (creep.attack(target) == ERR_NOT_IN_RANGE) {
          creep.moveTo(target)
        }
      }
      else {
        console.log(`No more targets in ${target_room_name}, ${creep.name}`)
      }
    })
  }
}
