import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, CreepActionResult, CreepType } from "classes/creep"

/**
 * WorkerSquad manages workers ([WORK, CARRY, MOVE] * n or [WORK * 2, CARRY * 2, MOVE * 3] * n)
 * to build or upgrade.
 */
export class WorkerSquad extends Squad {
  constructor(readonly name: string, readonly room_names: string[]) {
    super(name)

    // if (this.creeps.size < 5) {  // @fixme:
    //   console.log(`TEMP assign all creeps`)
    //   for (const creep_name in Game.creeps) {
    //     const creep = Game.creeps[creep_name]
    //     creep.memory.squad_name = this.name
    //     this.creeps.set(creep.name, creep)
    //   }
    //   }
  }

  public get type(): SquadType {
    return SquadType.WORKER
  }

  public get spawnPriority(): SpawnPriority {
    const really_need = this.creeps.size < 3

    const room = Game.rooms[this.room_names[0]]
    const max = 7//room.energyCapacityAvailable >= 600 ? 7 : 10
    const needWorker = this.creeps.size < max  // @todo: implement

    if (really_need) {
      return SpawnPriority.HIGH
    }
    return needWorker ? SpawnPriority.LOW : SpawnPriority.NONE
  }

  public static generateNewName(): string {
    return `${SquadType.WORKER}${Game.time}`
  }

  public generateNewName(): string {
    return WorkerSquad.generateNewName()
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    let energyUnit = 450

    if (capacity < energyUnit) {
      energyUnit = 200
    }

    const energyNeeded = Math.floor(capacity / energyUnit) * energyUnit // @todo: set upper limit

    return energyNeeded <= energyAvailable
  }

  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    let energyUnit = 450
    let bodyUnit: BodyPartConstant[] = [WORK, CARRY, MOVE, WORK, CARRY, MOVE, MOVE]
    let body: BodyPartConstant[] = []
    const name = this.generateNewName()
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.WORKER,
    }

    if (energyAvailable < energyUnit) {
      energyUnit = 200
      bodyUnit = [WORK, CARRY, MOVE]
    }

    while (energyAvailable >= energyUnit) {
      body = body.concat(bodyUnit)
      energyAvailable -= energyUnit
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  public run(): void {
    // @todo move harvest task to harvester squad

    const room = Game.rooms[this.room_names[0]]  // @fixme

    this.creeps.forEach((creep, _) => {
      creep.work(room)
    })
  }
}
