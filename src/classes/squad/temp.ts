import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export class TempSquad extends Squad {
  private target_room_name: string | undefined

  constructor(readonly name: string, readonly room_name: string, readonly energy_capacity: number) {
    super(name)

    switch (this.room_name) {
      case 'W51S29':
        // this.target_room_name = 'W49S26'
        break

      case 'W49S26':
        // this.target_room_name = 'W48S19' //'W47S16'
        break

      case 'W48S19':
        // this.target_room_name = 'W49S19'
        break

      case 'W48S12':
        // this.target_room_name = 'W44S7'
        // this.target_room_name = 'W48S6'
        break

      case 'W44S7':
        // this.target_room_name = 'W43S5'
        break

      case 'W38S7':
        // this.target_room_name = 'W33S7'
        break

      case 'W43S2':
        this.target_room_name = 'W42N1'
        break

      default:
        break
    }
  }

  public get type(): SquadType {
    return SquadType.TEMP
  }

  public static generateNewName(): string {
    return UID(SquadType.TEMP)
  }

  public generateNewName(): string {
    return TempSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    if (!this.target_room_name) {
      return SpawnPriority.NONE
    }

    const room = Game.rooms[this.target_room_name]

    if (room && room.controller && room.controller.my) {
      return SpawnPriority.NONE
    }

    return this.creeps.size < 1 ? SpawnPriority.LOW : SpawnPriority.NONE
    // return SpawnPriority.NONE

  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    const energy = (capacity >= 850) ? 850 : 750
    return energy_available >= energy

    // if (this.workers.length < 10) {
    //   return energy_available >= 1500
    // }
    // if (this.harvesters.length < 2) {
    //   return energy_available >= 1350
    // }
    // return false
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    this.addCreepForClaim(energy_available, spawn_func)
  }

  private addCreepForClaim(energyAvailable: number, spawnFunc: SpawnFunction): void {
    const body: BodyPartConstant[] = (energyAvailable >= 850) ? [MOVE, MOVE, MOVE, MOVE, MOVE, CLAIM] : [MOVE, MOVE, MOVE, CLAIM]
    const name = this.generateNewName()
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.CLAIMER,
      should_notify_attack: false,
      let_thy_die: true,
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  public run():void {
    if (!this.target_room_name) {
      this.say(`ERR`)
      return
    }
    const target_room_name = this.target_room_name

    this.creeps.forEach((creep) => {
      if (creep.moveToRoom(target_room_name) == ActionResult.IN_PROGRESS) {
        return
      }

      creep.claim(target_room_name, true)
    })
  }

  public _run(): void {
    const room = Game.rooms[this.room_name]

    const target_room_name = 'W49S34'
    const target_room = Game.rooms[target_room_name]

    this.creeps.forEach((creep) => {
      // if (((creep.ticksToLive || 0) < 1300) && (creep.room.spawns[0])) {
      //   creep.goToRenew(creep.room.spawns[0])
      //   return
      // }

      if (creep) {
        creep.memory.squad_name = 'worker65961626'
      }

      if (creep.moveToRoom(target_room_name) == ActionResult.IN_PROGRESS) {
        creep.memory.status = CreepStatus.NONE
        return
      }

      const needs_renew = !creep.memory.let_thy_die && ((creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || ((creep.ticksToLive || 0) < 200))

      if (needs_renew) {
        if ((creep.room.spawns.length > 0) && (creep.room.energyAvailable > 50) && !creep.room.spawns[0].spawning) {
          creep.goToRenew(creep.room.spawns[0])
          return
        }
        else if (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) {
          creep.memory.status = CreepStatus.HARVEST
        }
      }

      if (creep.memory.type == CreepType.HARVESTER) {
        // creep.moveTo(14, 17)
        const container = Game.getObjectById('5b0d9ce8fe018d5c746c2e0c') as StructureContainer | undefined
        if (container) {
          for (const resource_type of Object.keys(creep.carry)) {
            if (resource_type == RESOURCE_ENERGY) {
              continue
            }
            if (creep.carry[resource_type as ResourceConstant] == 0) {
              continue
            }

            if (creep.transfer(container, resource_type as ResourceConstant) == ERR_NOT_IN_RANGE) {
              creep.moveTo(container)
            }
            break
          }
        }
        return
      }
      let source = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return (structure.structureType == STRUCTURE_CONTAINER) && (structure.store.energy > 200)
        }
      }) as StructureContainer | undefined


      creep.work(target_room!, source)

      // ---

      // if (creep.room.name != this.room_name) {
      //   creep.moveToRoom(this.room_name)
      //   return
      // }


      // if (creep.memory.type == CreepType.HARVESTER) {
      //   // if (creep.carry.energy > 0) {
      //   //   if (creep.room.storage) {
      //   //     if (creep.transfer(creep.room.storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
      //   //       creep.moveTo(creep.room.storage)
      //   //     }
      //   //     return
      //   //   }
      //   // }
      //   // else if (_.sum(creep.carry) < creep.carryCapacity) {
      //   //   if (creep.room.storage) {
        //     for (const resource_type of Object.keys(creep.room.storage.store)) {
        //       if (resource_type == RESOURCE_ENERGY) {
        //         continue
        //       }
        //       if (creep.room.storage.store[resource_type as ResourceConstant] == 0) {
        //         continue
        //       }

        //       if (creep.withdraw(creep.room.storage, resource_type as ResourceConstant) == ERR_NOT_IN_RANGE) {
        //         creep.moveTo(creep.room.storage)
        //       }
        //       break
        //     }
      //   //   }
      //   // }
      //   // else {
      //     creep.moveTo(29, 31)
      //   // }
      //   return
      // }

      // if ((creep.memory.birth_time % 5) == 0) {
      //   creep.work(room, room.storage)
      //   return
      // }
      // creep.moveTo(31, 42)
    })
  }

  public description(): string {
    const addition = this.creeps.size > 0 ? `, ${Array.from(this.creeps.values())[0].pos}` : ''
    return `${super.description()} ${addition}`
  }

  // ----
  private addWorker(energyAvailable: number, spawnFunc: SpawnFunction): void {
    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      CARRY, MOVE, CARRY, MOVE,
      CARRY, MOVE, CARRY, MOVE,
      WORK, MOVE, WORK, MOVE, WORK, MOVE,
      WORK, MOVE, WORK, MOVE,
      CARRY, MOVE, CARRY, MOVE,
      WORK, MOVE,
    ]
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.WORKER,
      should_notify_attack: false,
      let_thy_die: false,
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  public addHarvester(energy_available: number, spawn_func: SpawnFunction): void {
    const body_unit: BodyPartConstant[] = [WORK, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE]
    const energy_unit = 450
    energy_available = Math.min(energy_available, 1350)

    const name = this.generateNewName()
    let body: BodyPartConstant[] = []
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.HARVESTER,
      should_notify_attack: false,
      let_thy_die: false,
    }

    while (energy_available >= energy_unit) {
      body = body.concat(body_unit)
      energy_available -= energy_unit
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }
}
