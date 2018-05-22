import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"
import { Region } from "../region"

export class LightWeightHarvesterSquad extends Squad {
  private source: Source | undefined  // A source that the harvester harvests energy

  constructor(readonly name: string, readonly source_info: {id: string, room_name: string}, readonly destination: StructureContainer | StructureTerminal | StructureStorage | StructureLink, readonly energy_capacity: number, readonly region: Region) {
    super(name)

    this.source = Game.getObjectById(this.source_info.id) as Source | undefined

    if (this.source_info.room_name == 'W44S43') {
      const link = Game.getObjectById('5af1cc45b2b1a554170136d1') as StructureLink  // W44S42 bottom left
      this.destination = link
    }
    else if (this.source_info.room_name == 'W48S49') {
      const link = Game.getObjectById('5aeed7712e007b09769feb8f') as StructureLink  // W48S47 bottom right
      this.destination = link
    }
  }

  public get type(): SquadType {
    return SquadType.LIGHTWEIGHT_HARVESTER
  }

  public static generateNewName(): string {
    return UID(SquadType.LIGHTWEIGHT_HARVESTER)
  }

  public generateNewName(): string {
    return LightWeightHarvesterSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    if (this.energy_capacity < 450) {
      return SpawnPriority.NONE
    }

    const room = Game.rooms[this.source_info.room_name]
    if (!room || room.attacked) {
      return SpawnPriority.NONE
    }

    return this.creeps.size > 0 ? SpawnPriority.NONE : SpawnPriority.LOW
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    const energy_unit = 450

    const energy_needed = Math.min(Math.floor(capacity / energy_unit) * energy_unit, 2250)
    return energy_available >= energy_needed
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    const body_unit: BodyPartConstant[] = [WORK, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE]
    const energy_unit = 450
    energy_available = Math.min(energy_available, 2250)

    const name = this.generateNewName()
    let body: BodyPartConstant[] = []
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.HARVESTER,
      let_thy_die: true,
    }

    while (energy_available >= energy_unit) {
      body = body.concat(body_unit)
      energy_available -= energy_unit
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  public run(): void {
    this.creeps.forEach((creep) => {
      const room = Game.rooms[this.source_info.room_name]
      if (room && room.attacked && this.region.worker_squad) {
        creep.memory.squad_name = this.region.worker_squad.name
        return
      }

      if ((creep.memory.status == CreepStatus.NONE) || (creep.memory.status == CreepStatus.BUILD) || (creep.memory.status == CreepStatus.UPGRADE)) {
        creep.memory.status = CreepStatus.CHARGE
      }

      if (creep.memory.status == CreepStatus.HARVEST) {
        if (creep.carry.energy == creep.carryCapacity) {
          creep.memory.status = CreepStatus.CHARGE
        }
        else if (this.source && (this.source.energy == 0) && (this.source.ticksToRegeneration > 50) && (creep.carry.energy > (creep.carryCapacity / 2))) {
          creep.memory.status = CreepStatus.CHARGE
        }
        else {
          if (creep.room.attacked) {
            if (Game.shard.name != 'swc') {
              creep.say('RUN')
              creep.moveTo(this.destination)
              creep.memory.status = CreepStatus.CHARGE
              return
            }
          }

          if (creep.room.resourceful_tombstones.length > 0) {
            const target = creep.room.resourceful_tombstones[0]
            const resource_amount = _.sum(target.store)
            if (resource_amount > 0) {
              const vacancy = creep.carryCapacity - _.sum(creep.carry)
              if (vacancy < resource_amount) {
                creep.drop(RESOURCE_ENERGY, resource_amount - vacancy)
              }

              let resource_type: ResourceConstant | undefined
              for (const type of Object.keys(target.store)) {
                resource_type = type as ResourceConstant
              }
              if (resource_type) {
                if (creep.withdraw(target, resource_type) == ERR_NOT_IN_RANGE) {
                  creep.moveTo(target)
                  creep.say(`${target.pos.x}, ${target.pos.y}`)
                }
                return
              }
            }
          }

          if (this.source) {
            if (creep.harvest(this.source!) == ERR_NOT_IN_RANGE) {
              creep.moveTo(this.source)
              return
            }
          }
          else {
            creep.moveToRoom(this.source_info.room_name)
            return
          }
        }
      }

      if (creep.memory.status == CreepStatus.CHARGE) {
        if (creep.carry.energy == 0) {
          if (((creep.ticksToLive || 0) < 200) && (creep.room.name == 'W44S42')) {
            // @fixme: temp code
            creep.memory.squad_name = 'worker5864301'
            creep.memory.status = CreepStatus.NONE
            creep.memory.let_thy_die = true
            return
          }
          creep.memory.status = CreepStatus.HARVEST
        }
        if (Game.shard.name == 'swc') {
          const controller = Game.rooms['E13S19'].controller!
          creep.upgradeController(controller)
          creep.moveTo(controller)
        }
        else if (creep.transfer(this.destination, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(this.destination)
        }
      }
    })
  }

  public description(): string {
    const room = Game.rooms[this.source_info.room_name]
    let additions = ''

    if (!room) {
      additions = `, No visibility of ${this.source_info.room_name}`
    }
    else if (room.attacked) {
      additions = `, Room ${this.source_info.room_name} is under attack`
    }

    return `${super.description()}, ${this.source_info.room_name}${additions}`
  }
}
