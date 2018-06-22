import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"
import { isNewLine } from "../../../node_modules/@types/acorn/index";

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
    const size = this.room_name == 'W49S34' ? this.creeps.size : Array.from(this.creeps.values()).filter(c=>c.memory.type==CreepType.WORKER).length

    if (size < 2) {
      return SpawnPriority.URGENT
    }

    let max = 8
    const room = Game.rooms[this.room_name]

    // if (room && room.controller) {
    //   if ((room.controller.level < 3)) {
    //     max = 10
    //   }
    //   else if (room.controller.level < 4) {
    //     max = 10
    //   }
    // }

    if (this.room_name == 'W51S29') {
      max = 2
    }
    else if (this.room_name == 'W48S19') {
      max = 5
    }
    else if (this.room_name == 'W48S12') {
      max = 6
    }
    else if (this.room_name == 'W49S26') {
      max = 6
    }
    else if (this.room_name == 'W44S7') {
      max = 4
    }
    else if (this.room_name == 'W48S6') {
      max = 5
    }
    else if (this.room_name == 'W38S7') {
      max = 8
    }
    else if (this.room_name == 'W33S7') {
      max = 6
    }
    else if (this.room_name == 'W49S19') {
      max = 1
    }
    else if (this.room_name == 'W43S5') {
      max = 5
    }

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
    if ((this.creeps.size < 2) && (energy_available >= 200)) {
      return true
    }

    let energy_unit = 200

    const energy_needed = Math.min(Math.floor((capacity - 50) / energy_unit) * energy_unit, 1000)
    return energy_available >= energy_needed
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    const energy_unit = 200
    let body_unit: BodyPartConstant[] = [WORK, CARRY, MOVE]
    let type = CreepType.WORKER
    let let_thy_die = true

    const number_of_carriers = Array.from(this.creeps.values()).filter(c=>c.memory.type == CreepType.CARRIER).length
    const room = Game.rooms[this.room_name]

    // if ((this.creeps.size > 2) && (number_of_carriers == 0) && room && room.controller && (this.room_name == 'W49S34')) {//(room.controller.level >= 5)) {
    //   body_unit = [CARRY, MOVE, CARRY, MOVE]
    //   type = CreepType.CARRIER
    // }


    let body: BodyPartConstant[] = []
    const name = this.generateNewName()
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: type,
      should_notify_attack: false,
      let_thy_die: let_thy_die,
    }

    energy_available = Math.min(energy_available, 1000)

    while (energy_available >= energy_unit) {
      body = body.concat(body_unit)
      energy_available -= energy_unit
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  public run(): void {
    const room: Room | undefined = Game.rooms[this.room_name]
    const storage = (room.storage && (room.storage.store.energy > 0)) ? room.storage : undefined
    const terminal = (room.terminal && (room.terminal.store.energy > 0)) ? room.terminal : undefined

    // If enemy storage | terminal is covered with a rampart, withdraw() throws error and workers stop moving
    const source_global: StructureStorage | StructureTerminal | StructureContainer | undefined = storage || terminal
    let containers: StructureContainer[] = []

    if (room) {
      containers = room.find(FIND_STRUCTURES, {
        filter: (structure: AnyStructure) => {
          return (structure.structureType == STRUCTURE_CONTAINER) && (structure.store.energy > 100)
        }
      }) as StructureContainer[]
    }

    let room_to_escape: string | undefined

    switch (this.room_name) {
      case 'W48S12':
        room_to_escape = 'W47S12'
        break

      case 'W49S19':
        room_to_escape = 'W49S18'
        break

      case 'W48S19':
        room_to_escape = 'W49S18'
        break

      case 'W48S6':
        room_to_escape = 'W48S7'
        break

      case 'W44S7':
        room_to_escape = 'W44S8'
        break

      case 'W38S7':
        room_to_escape = 'W37S7'
        break

      case 'W33S7':
        room_to_escape = 'W32S7'
        break

      case 'W43S2':
        room_to_escape = 'W43S3'
        break

      case 'W43S5':
        room_to_escape = 'W42S5'
        break
    }

    for (const creep_name of Array.from(this.creeps.keys())) {
      const creep = this.creeps.get(creep_name)!

      if (room_to_escape && room.attacked && room.controller && room.controller.my && (room.controller.level <= 3)) {
        creep.drop(RESOURCE_ENERGY)
        if (creep.moveToRoom(room_to_escape) == ActionResult.IN_PROGRESS) {
          creep.say(`wRUN`)
          continue
        }
        creep.moveTo(25, 25)
        continue
      }

      if ((room.name == 'W44S7') || (room.name == 'W48S6') || (room.name == 'W38S7') || (room.name == 'W33S7') || (room.name == 'W43S2') || (room.name == 'W42S5') || (room.name == 'W43S5')) {
        if (creep.hits >= 1500) {
          creep.memory.let_thy_die = false
        }

        if (room.controller && room.controller.my && (room.controller.level >= 4)) {
          creep.memory.let_thy_die = true
        }
      }

      let source_local: StructureStorage | StructureTerminal | StructureContainer | undefined = source_global

      if (creep.room.name != this.room_name) {
        if (creep.carry.energy > 0) {
          creep.drop(RESOURCE_ENERGY)
        }
        creep.moveToRoom(this.room_name)
        continue
      }

      if (this.room_name == 'W51S29') {
        if (room && room.storage && (room.storage.store.energy > 300)) {

        }
        else {
          let objects: (StructureContainer | Source)[] = creep.room.sources
          objects = objects.concat(containers)

          const target = creep.pos.findClosestByPath(objects) as StructureContainer | Source | undefined

          if (target && (target as StructureContainer).structureType) {
            source_local = (target as StructureContainer)
          }
        }
      }

      const needs_renew = !creep.memory.let_thy_die && ((creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || (((creep.ticksToLive || 0) < 350) && (creep.carry.energy > (creep.carryCapacity * 0.8))))// !creep.memory.let_thy_die && ((creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || ((creep.ticksToLive || 0) < 300))
      // if (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) {
      //   creep.memory.status = CreepStatus.NONE
      // }

      if (needs_renew) {
        if ((creep.room.spawns.length > 0) && ((creep.room.energyAvailable > 40) || ((creep.ticksToLive ||0) > 400)) && !creep.room.spawns[0].spawning) {
          creep.goToRenew(creep.room.spawns[0])
          continue
        }
        else if (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) {
          creep.memory.status = CreepStatus.HARVEST
        }
      }

      if ((creep.ticksToLive || 0) < 15) {
        if (creep.transfer(creep.room.storage!, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.storage!)
        }
        continue
      }

      creep.work(room, source_local)
    }
  }
}
