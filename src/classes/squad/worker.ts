import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType, WorkerSource } from "classes/creep"
import { isNewLine } from "../../../node_modules/@types/acorn/index";

interface WorkerSquadMemory extends SquadMemory {
  number_of_workers?: number
  room_to_escape?: string
}

/**
 * WorkerSquad manages workers ([WORK, CARRY, MOVE] * n or [WORK * 2, CARRY * 2, MOVE * 3] * n)
 * to build or upgrade.
 */
export class WorkerSquad extends Squad {
  private number_of_workers: number
  private source_container: StructureContainer | undefined
  private additional_container_ids: string[] | undefined

  constructor(readonly name: string, readonly room_name: string, readonly opt?: {source?: StructureContainer | undefined, additional_container_ids?: string[]}) {
    super(name)

    opt = opt || {}
    if (opt.source) {
      this.source_container = opt.source
    }
    this.additional_container_ids = opt.additional_container_ids

    const squad_memory = Memory.squads[this.name] as WorkerSquadMemory
    if (!squad_memory) {
      this.number_of_workers = 0
      return
    }

    if (squad_memory.number_of_workers) {
      this.number_of_workers = squad_memory.number_of_workers
    }
    else if (this.room_name == 'W51S29') {
      this.number_of_workers = 3
    }
    else if (this.room_name == 'W48S6') {
      this.number_of_workers = 2
    }
    else if (this.room_name == 'W43S5') {
      this.number_of_workers = 3
    }
    else if (this.room_name == 'W43S2') {
      this.number_of_workers = 6
    }
    else if (this.room_name == 'W42N1') {
      this.number_of_workers = 4
    }
    else if (this.room_name == 'W47N5') {
      this.number_of_workers = 4
    }
    else {
      this.number_of_workers = 8
    }
  }

  public get type(): SquadType {
    return SquadType.WORKER
  }

  public get spawnPriority(): SpawnPriority {
    const squad_memory = Memory.squads[this.name] as WorkerSquadMemory
    if (!squad_memory || squad_memory.stop_spawming) {
      return SpawnPriority.NONE
    }

    const room = Game.rooms[this.room_name]

    if ((this.room_name == 'W43N5') && room && room.controller && (room.controller.level < 4) && ((Game.time % 2) == 1)) {
      return SpawnPriority.NONE
    }

    // return SpawnPriority.NONE // @fixme: for debugging upgrader
    const size = this.room_name == 'W49S34' ? this.creeps.size : Array.from(this.creeps.values()).filter(c=>c.memory.type==CreepType.WORKER).length

    if (size < 1) {
      return SpawnPriority.URGENT
    }

    return size < this.number_of_workers ? SpawnPriority.NORMAL : SpawnPriority.NONE

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
    if ((this.creeps.size < 1) && (energy_available >= 200)) {
      return true
    }
    // if (this.room_name == 'W56S7') {
    //   return true
    // }

    let energy_unit = 200

    const energy_needed = Math.min(Math.floor((capacity - 50) / energy_unit) * energy_unit, 1000)
    return energy_available >= energy_needed
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    let energy_unit = 200
    let body_unit: BodyPartConstant[] = [WORK, CARRY, MOVE]
    let type = CreepType.WORKER
    let let_thy_die = true

    const room = Game.rooms[this.room_name]
    const rcl = (!(!room) && !(!room.controller)) ? room.controller.level : 1

    if (rcl >= 7) {
      const number_of_carriers = Array.from(this.creeps.values()).filter(c=>c.memory.type == CreepType.CARRIER).length

      if (((this.creeps.size > 1) && (number_of_carriers == 0)) || ((this.creeps.size > 2) && (number_of_carriers == 1))) {
        body_unit = [CARRY, CARRY, MOVE]
        energy_unit = 150
        type = CreepType.CARRIER
      }
    }


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
    const sources: WorkerSource[] = []
    if (storage) {
      sources.push(storage)
    }
    else if (terminal) {
      sources.push(terminal)
    }

    if (this.source_container) {
      sources.push(this.source_container)
    }

    let room_to_escape: string | undefined

    switch (this.room_name) {
      case 'W48S6':
        room_to_escape = 'W48S7'
        break

      case 'W44S7':
        room_to_escape = 'W44S8'
        break

      case 'W43S2':
        room_to_escape = 'W43S3'
        break

      case 'W43S5':
        room_to_escape = 'W42S5'
        break

      case 'W42N1':
        room_to_escape = 'W42N2'
        break

      case 'W47N2':
        room_to_escape = 'W46N2'
        break

      case 'W43N5':
        room_to_escape = 'W43N6'
        break

      case 'W47N5':
        room_to_escape = 'W47N4'
        break

      case 'W47S14':
        room_to_escape = 'W47S15'
        break

      case 'W39S9':
        room_to_escape = 'W38S9'
        break

      case 'W47S9':
        room_to_escape = 'W46S9'
        break

      case 'E16N37':
        room_to_escape = 'E15N37'
        break
      }

    const squad_memory = Memory.squads[this.name] as WorkerSquadMemory
    if (squad_memory.room_to_escape) {
      room_to_escape = squad_memory.room_to_escape
    }

    for (const creep_name of Array.from(this.creeps.keys())) {
      const creep = this.creeps.get(creep_name)!

      if (creep.spawning) {
        continue
      }

      // if ((this.room_name == 'W43N5') && (this.creeps.size > 3)) {
      //   if ((creep.hits == creep.hitsMax) && ((creep.ticksToLive || 0) > 1400)) {
      //     const colony_worker_memory = Memory.squads['worker771957135']
      //     if (colony_worker_memory && (colony_worker_memory.number_of_creeps < 10)) {
      //       creep.memory.squad_name = colony_worker_memory.name
      //       continue
      //     }
      //   }
      // }

      if (room_to_escape && ((room.attacker_info.attack + room.attacker_info.ranged_attack) > 0) && room.controller && room.controller.my && (room.controller.level <= 3)) {
        if (creep.memory.type == CreepType.WORKER) {
          creep.drop(RESOURCE_ENERGY)
        }
        if (creep.moveToRoom(room_to_escape) == ActionResult.IN_PROGRESS) {
          creep.say(`wRUN`)
          continue
        }
        creep.moveTo(25, 25)
        continue
      }

      if (room.controller && room.controller.my && (room.controller.level < 4) && (creep.hits >= 1500)) {
        creep.memory.let_thy_die = false
      }
      else {
        creep.memory.let_thy_die = true
      }

      if (creep.room.name != this.room_name) {
        if ((creep.carry.energy > 0) && (creep.memory.type == CreepType.WORKER)) {
          creep.drop(RESOURCE_ENERGY)
        }
        creep.moveToRoom(this.room_name)
        continue
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

      let opts: {additional_container_ids?: string[]} = {}

      if (this.additional_container_ids) {
        opts.additional_container_ids = this.additional_container_ids
      }

      creep.work(room, sources, opts)
    }
  }

  public description(): string {
    return `${super.description()}, ${this.creeps.size}/${this.number_of_workers}`
  }
}
