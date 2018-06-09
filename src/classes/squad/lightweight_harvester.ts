import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"
import { Region } from "../region"

export class LightWeightHarvesterSquad extends Squad {
  private source: Source | undefined  // A source that the harvester harvests energy

  constructor(readonly name: string, readonly source_info: {id: string, room_name: string}, readonly destination: StructureContainer | StructureTerminal | StructureStorage | StructureLink | StructureSpawn, readonly energy_capacity: number, readonly region: Region) {
    super(name)

    this.source = Game.getObjectById(this.source_info.id) as Source | undefined

    if (this.source_info.room_name == 'W48S49') {
      const link = Game.getObjectById('5aeed7712e007b09769feb8f') as StructureLink  // W48S47 bottom right
      this.destination = link
    }
    else if (['W49S46', 'W49S45', 'W48S46'].indexOf(this.source_info.room_name) >= 0) {
      const link = Game.getObjectById('5af1b738f859db1e994a9e02') as StructureLink  // W49S47 upper right
      this.destination = link
    }
    else if (['W49S39'].indexOf(this.source_info.room_name) >= 0) {
      const link = Game.getObjectById('5b0a65a7741ae20afad04d05') as StructureLink  // W48S39 upper left
      this.destination = link
    }
    // else if (['W49S35', 'W49S36'].indexOf(this.source_info.room_name) >= 0) {
    else if (['W49S36'].indexOf(this.source_info.room_name) >= 0) {
      const container = Game.getObjectById('5b0e051f5b5e535c68b7d333') as StructureContainer | undefined  // W49S34 bottom
      if (container) {
        this.destination = container
      }
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
    const w45s42 = Game.rooms['W45S42']

    // if (this.source_info.room_name == 'W43S42') {
    //   console.log(`HOGE ${this.source_info.room_name}, ${room}, ${room ? room.attacked : 'no visibility'}`)
    // }

    if (!room || room.heavyly_attacked) {
      return SpawnPriority.NONE
    }
    else if ((!w45s42 || w45s42.heavyly_attacked) && (['W45S41', 'W45S42', 'W45S43', 'W46S42', 'W46S43', 'W44S43'].indexOf(this.source_info.room_name) >= 0)) {
      return SpawnPriority.NONE
    }

    if (this.source_info.room_name == 'W49S36') {
      return this.creeps.size > 1 ? SpawnPriority.NONE : SpawnPriority.LOW
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
      const w45s42 = Game.rooms['W45S42']

      if (((room && room.heavyly_attacked) || (creep.hits < creep.hitsMax)) && this.region.worker_squad) {
        creep.memory.squad_name = this.region.worker_squad.name
        return
      }
      else if (((!w45s42 || w45s42.heavyly_attacked) || (creep.hits < creep.hitsMax)) && (['W45S41', 'W45S42', 'W45S43', 'W46S42', 'W46S43', 'W44S43'].indexOf(this.source_info.room_name) >= 0)) {
        creep.memory.squad_name = this.region.worker_squad.name
        return
      }

      const needs_renew = !creep.memory.let_thy_die && ((creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || ((creep.ticksToLive || 0) < 300))

      if (needs_renew) {
        if ((creep.room.spawns.length > 0) && ((creep.room.energyAvailable > 40) || ((creep.ticksToLive || 0) < 500)) && !creep.room.spawns[0].spawning) {
          creep.goToRenew(creep.room.spawns[0])
          return
        }
        else if (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) {
          creep.memory.status = CreepStatus.CHARGE
        }
      }

      if ((creep.memory.status == CreepStatus.NONE) || (creep.memory.status == CreepStatus.BUILD) || (creep.memory.status == CreepStatus.UPGRADE)) {
        creep.memory.status = CreepStatus.CHARGE
      }

      if (creep.memory.status == CreepStatus.HARVEST) {
        if (creep.carry.energy == creep.carryCapacity) {
          creep.memory.status = CreepStatus.CHARGE
        }
        else {
          if (creep.carry.energy < (creep.carryCapacity - 50)) {
            const drop = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 10, {
              filter: (d: Resource) => {
                return (d.resourceType == RESOURCE_ENERGY) && (d.amount > 50)
              }
            })[0] as Resource
            if (drop) {
              if (creep.pickup(drop) == ERR_NOT_IN_RANGE) {
                creep.moveTo(drop)
                return
              }
              else if (creep.carry.energy > 200) {
                creep.memory.status = CreepStatus.CHARGE
              }
            }
            const tomb = creep.pos.findClosestByPath(FIND_TOMBSTONES, {
              filter: (t) => t.store.energy > 50
            })
            if (tomb) {
              if (creep.withdraw(tomb, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(tomb)
                return
              }
              else if (creep.carry.energy > 200) {
                creep.memory.status = CreepStatus.CHARGE
              }
            }
          }

          if (this.source && (this.source.energy == 0) && (this.source.ticksToRegeneration > 50) && (creep.carry.energy > (creep.carryCapacity / 2))) {
            creep.memory.status = CreepStatus.CHARGE
          }
          else {
            if (creep.room.heavyly_attacked) {
              const closest_hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
                filter: (hostile_creep) => {
                  return (hostile_creep.getActiveBodyparts(ATTACK) + hostile_creep.getActiveBodyparts(RANGED_ATTACK)) > 0
                }
              })
              if (closest_hostile && (creep.pos.getRangeTo(closest_hostile) < 8)) {
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
                const ignoreCreeps = false//((Game.time % 2) == 0) ? false : true

                creep.moveTo(this.source, {
                  ignoreCreeps: ignoreCreeps
                })
                return
              }
            }
            else {
              creep.moveToRoom(this.source_info.room_name)
              return
            }
          }
        }
      }

      if (creep.memory.status == CreepStatus.CHARGE) {
        if (_.sum(creep.carry) == 0) {
          if ((this.region.room.name != 'W49S34') && ((creep.ticksToLive || 0) < 200) && this.region.worker_squad) {
            creep.memory.squad_name = this.region.worker_squad.name
            creep.memory.status = CreepStatus.CHARGE
            creep.memory.let_thy_die = true
            return
          }
          creep.memory.status = CreepStatus.HARVEST
        }
        else {
          // if ((this.source_info.room_name == 'W49S34') && (creep.room.controller) && creep.room.controller.my) {
          //   creep.upgradeController(creep.room.controller)
          //   creep.moveTo(creep.room.controller)
          //   return
          // }

          for (const resource_type of Object.keys(creep.carry)) {
            const amount = creep.carry[resource_type as ResourceConstant]
            if (amount == 0) {
              continue
            }

            const result = creep.transfer(this.destination, resource_type as ResourceConstant)
            switch (result) {
              case ERR_NOT_IN_RANGE:
                creep.moveTo(this.destination)
                break

              case OK:
                break

              default:
                // if (!this.destination) {
                  // console.log(`LightweightHarvesterSquad.run unexpectedly found nil target: ${this.destination}, ${this.name}, ${creep.name} at ${creep.pos}`)

                  if (this.region.room.controller && this.region.room.controller.my) {
                    if (creep.upgradeController(this.region.room.controller) == ERR_NOT_IN_RANGE) {
                      creep.moveTo(this.region.room.controller)
                    }
                  }
                  else {
                    console.log(`LightweightHarvesterSquad.run unexpectedly found no my controller on ${this.region.room}`)
                  }
                // }
                // else {
                  console.log(`LightweightHarvesterSquad.run unexpected transfer error ${result}, target: ${this.destination}, ${this.name}, ${creep.name} at ${creep.pos}`)
                // }
            }
          }
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
    else if (room.heavyly_attacked) {
      additions = `, Room ${this.source_info.room_name} is under attack`
    }

    return `${super.description()}, ${this.source_info.room_name}${additions}`
  }
}
