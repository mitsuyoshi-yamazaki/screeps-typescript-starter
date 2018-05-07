import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

/**
 * WorkerSquad manages workers ([WORK, CARRY, MOVE] * n or [WORK * 2, CARRY * 2, MOVE * 3] * n)
 * to build or upgrade.
 */
export class WorkerSquad extends Squad {
  constructor(readonly name: string, readonly room_name: string, readonly delegated?: boolean) {
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
    const really_need = (!this.delegated) && (this.creeps.size < 3)

    const room = Game.rooms[this.room_name]
    const max = this.room_name == 'W48S47' ? 7 : 6
    const needWorker = this.creeps.size < max  // @todo: implement

    if (really_need) {
      return SpawnPriority.HIGH
    }
    return needWorker ? SpawnPriority.LOW : SpawnPriority.NONE
  }

  public static generateNewName(): string {
    return UID(SquadType.WORKER)
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

    return energyAvailable >= energyNeeded
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
    let room = Game.rooms[this.room_name]
    let source = room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return (structure.structureType == STRUCTURE_STORAGE)
          && ((structure as StructureStorage).store.energy > 300)
      }
    })[0] as StructureStorage | undefined

    for (const creep_name of Array.from(this.creeps.keys())) {
      const creep = this.creeps.get(creep_name)!

      if (creep.room.name != this.room_name) {
        creep.moveToRoom(this.room_name)
        continue
      }

      const needs_renew = (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || ((creep.ticksToLive || 0) < 300)

      if (needs_renew) {
        if (creep.room.spawns.length > 0) {
          creep.goToRenew(creep.room.spawns[0])
          continue
        }
      }
      creep.work(room, source)
    }
  }
}
