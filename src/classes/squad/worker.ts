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
  }

  public get type(): SquadType {
    return SquadType.WORKER
  }

  public get spawnPriority(): SpawnPriority {
    // return SpawnPriority.NONE // @fixme: for debugging upgrader
    const size = Array.from(this.creeps.values()).filter(c=>c.memory.type==CreepType.WORKER).length

    if (size < 2) {
      return SpawnPriority.URGENT
    }

    const max = this.room_name == 'W48S47' ? 3 : 5
    return size < max ? SpawnPriority.NORMAL : SpawnPriority.NONE

    // const really_need = (!this.delegated) && (this.creeps.size < 3)

    // const room = Game.rooms[this.room_name]
    // const max = this.room_name == 'W48S47' ? 3 : 3
    // const needWorker = this.creeps.size < max  // @todo: implement

    // if (really_need) {
    //   return SpawnPriority.HIGH
    // }
    // return needWorker ? SpawnPriority.LOW : SpawnPriority.NONE
  }

  public static generateNewName(): string {
    return UID(SquadType.WORKER)
  }

  public generateNewName(): string {
    return WorkerSquad.generateNewName()
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    let energy_unit = 200

    const energy_needed = Math.min(Math.floor(capacity / energy_unit) * energy_unit, 1400)
    return energy_available >= energy_needed
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    const energy_unit = 200
    const body_unit: BodyPartConstant[] = [WORK, CARRY, MOVE]
    let body: BodyPartConstant[] = []
    const name = this.generateNewName()
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.WORKER,
      let_thy_die: false,
    }

    energy_available = Math.min(energy_available, 1400)

    while (energy_available >= energy_unit) {
      body = body.concat(body_unit)
      energy_available -= energy_unit
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  public run(): void {
    const room = Game.rooms[this.room_name]
    const storage = (room.storage && (room.storage.store.energy > 1000)) ? room.storage : undefined
    const terminal = (room.terminal && (room.terminal.store.energy > 1000)) ? room.terminal : undefined

    const source = storage || terminal

    for (const creep_name of Array.from(this.creeps.keys())) {
      const creep = this.creeps.get(creep_name)!

      // if (this.room_name == 'W44S42') {
      //   const target = Game.getObjectById('5af458f814e9d72ab64b0198') as Tombstone
      //   if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
      //     const r = creep.moveTo(target)
      //     console.log(`ERROR ${r}, ${creep.name}`)
      //   }
      //   // creep.moveTo(38, 7)
      //   // creep.drop(RESOURCE_ENERGY)
      //   console.log(`target: ${target}`)
      //   continue
      // }

      // 1165

      // if (creep.id == '5aede8f04390a242a4c00c44') {
      //   let resource_type: string | undefined
      //   for (const type of Object.keys(creep.carry)) {
      //     if (type == 'energy') {
      //       continue
      //     }
      //     resource_type = type
      //     break
      //   }
      //   if (resource_type) {
      //     const storage = Game.getObjectById('5aefe21eaade48390c7da59c') as StructureStorage
      //     const r = creep.transfer(storage, resource_type as ResourceConstant)
      //     if (r == ERR_NOT_IN_RANGE) {
      //       creep.moveTo(storage)
      //     }
      //     console.log(`ERROR: ${r}, ${resource_type}, ${creep.name}`)
      //   }
      //   continue
      // }

      if (creep.room.name != this.room_name) {
        creep.moveToRoom(this.room_name)
        continue
      }

      // Renewal needs almost same but slightly less time
      // const needs_renew = false//!creep.memory.let_thy_die && ((creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || ((creep.ticksToLive || 0) < 300))
      if (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) {
        creep.memory.status = CreepStatus.NONE
      }

      // if (needs_renew) {
      //   if ((creep.room.spawns.length > 0) && (creep.room.energyAvailable > 0) && !creep.room.spawns[0].spawning) {
      //     creep.goToRenew(creep.room.spawns[0])
      //     continue
      //   }
      //   else if (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) {
      //     creep.memory.status = CreepStatus.HARVEST
      //   }
      // }

      if ((creep.ticksToLive || 0) < 15) {
        if (creep.transfer(creep.room.storage!, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.storage!)
        }
        return
      }

      creep.work(room, source)
    }
  }
}
