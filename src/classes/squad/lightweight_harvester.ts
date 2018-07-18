import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"
import { Region } from "../region"

interface LightWeightHarvesterMemory extends CreepMemory {
  target_drop_id?: string
  target_tombstone_id?: string
}

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
      const link = Game.getObjectById('5aef62f86627413133777bdf') as StructureStorage  // W49S47
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
    const memory = Memory.squads[this.name]
    if (memory.stop_spawming) {
      return SpawnPriority.NONE
    }

    if ((this.energy_capacity < 450) && (this.source_info.room_name != 'W49S27')) {
      return SpawnPriority.NONE
    }
    // else if (this.source_info.room_name == 'W45S5') {
    //   return SpawnPriority.NONE
    // }

    const room = Game.rooms[this.source_info.room_name]

    if (!room || room.attacked) {
      return SpawnPriority.NONE
    }

    if (this.source_info.room_name == 'W49S36') {
      return this.creeps.size > 1 ? SpawnPriority.NONE : SpawnPriority.LOW
    }

    let max = 1

    if (this.energy_capacity < 1350) {
      max = 1
    }

    if (this.source_info.id == '59f1a02982100e1594f36321') {  // W45S5
      max = 1//3
    }

    return this.creeps.size < max ? SpawnPriority.LOW : SpawnPriority.NONE
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    return this.hasEnoughEnergyForLightWeightHarvester(energy_available, capacity)
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    this.addLightWeightHarvester(energy_available, spawn_func)
  }

  public run(): void {
    this.creeps.forEach((creep) => {
      if (creep.spawning) {
        return
      }

      const memory = creep.memory as LightWeightHarvesterMemory
      const room = Game.rooms[this.source_info.room_name]

      if (((room && !room.is_keeperroom && room.heavyly_attacked) || (creep.hits < creep.hitsMax)) && this.region.worker_squad) {
        creep.memory.squad_name = this.region.worker_squad.name
        return
      }

      const needs_renew = !creep.memory.let_thy_die && ((creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || ((creep.ticksToLive || 0) < 400))

      if (needs_renew) {
        if ((creep.room.spawns.length > 0) && ((creep.room.energyAvailable > 40) || ((creep.ticksToLive || 0) < 600)) && !creep.room.spawns[0].spawning) {
          creep.goToRenew(creep.room.spawns[0])
          return
        }
        else if (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) {
          creep.memory.status = CreepStatus.CHARGE
        }
      }

      if ((creep.memory.status == CreepStatus.NONE) || (creep.memory.status == CreepStatus.BUILD)) {
        creep.memory.status = CreepStatus.CHARGE
      }

      let moveToOps: MoveToOpts = {
        maxOps: 500,
        maxRooms: 1,
        reusePath: 2,
      }

      if (creep.room.resourceful_tombstones.length > 0) {
        let tomb: Tombstone | undefined

        if (memory.target_tombstone_id) {
          tomb = Game.getObjectById(memory.target_tombstone_id) as Tombstone | undefined
        }
        else {
          tomb = creep.room.resourceful_tombstones[0]
        }

        if (tomb) {
          const resource_amount = _.sum(tomb.store) - tomb.store.energy
          if (resource_amount > 0) {
            (creep.memory as LightWeightHarvesterMemory).target_tombstone_id = tomb.id

            const vacancy = creep.carryCapacity - _.sum(creep.carry)
            if (vacancy < resource_amount) {
              creep.drop(RESOURCE_ENERGY, resource_amount - vacancy)
            }

            if (creep.withdrawResources(tomb) == ERR_NOT_IN_RANGE) {
              creep.moveTo(tomb, moveToOps)
              creep.say(`${tomb.pos.x}, ${tomb.pos.y}`)
            }
          }
          else {
            (creep.memory as LightWeightHarvesterMemory).target_tombstone_id = undefined
          }
        }
        else {
          (creep.memory as LightWeightHarvesterMemory).target_tombstone_id = undefined
        }
        return
      }
      else if ((_.sum(creep.carry) - creep.carry.energy) > 0) {
        creep.memory.status = CreepStatus.CHARGE
      }

      if (creep.memory.status == CreepStatus.HARVEST) {
        if (creep.carry.energy == creep.carryCapacity) {
          creep.memory.status = CreepStatus.CHARGE
        }
        else {
          if (creep.carry.energy < (creep.carryCapacity - 50)) {
            let drop: Resource | undefined

            if (memory.target_drop_id) {
              drop = Game.getObjectById(memory.target_drop_id) as Resource | undefined
            }
            else if ((Game.time % 19) == 5) {
              drop = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 10, {
                filter: (d: Resource) => {
                  return (d.resourceType == RESOURCE_ENERGY) && (d.amount > 50)
                }
              })[0] as Resource
            }

            if (drop) {
              (creep.memory as LightWeightHarvesterMemory).target_drop_id = drop.id

              if (creep.pickup(drop) == ERR_NOT_IN_RANGE) {
                creep.moveTo(drop, moveToOps)
              }
              return
            }
            else {
              (creep.memory as LightWeightHarvesterMemory).target_drop_id = undefined
            }
            // const tomb = creep.pos.findClosestByPath(FIND_TOMBSTONES, {
            //   filter: (t) => t.store.energy > 50
            // })
            // if (tomb) {
            //   if (creep.withdraw(tomb, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            //     creep.moveTo(tomb)
            //     return
            //   }
            //   else if (creep.carry.energy > 200) {
            //     creep.memory.status = CreepStatus.CHARGE
            //   }
            // }
          }

          if (this.source && (this.source.energy == 0) && (this.source.ticksToRegeneration > 50) && (creep.carry.energy > (creep.carryCapacity / 2))) {
            creep.memory.status = CreepStatus.CHARGE
          }
          else {
            if (creep.room.heavyly_attacked && !creep.room.is_keeperroom) {
              const closest_hostile = creep.pos.findInRange(creep.room.attacker_info.hostile_creeps, 10)[0]
              if (closest_hostile) {
                creep.say('RUN')
                if (this.destination && (creep.moveToRoom(this.destination.room.name) == ActionResult.IN_PROGRESS)) {
                  return
                }
                creep.moveTo(this.destination, moveToOps)
                creep.memory.status = CreepStatus.CHARGE
                return
              }
            }

            if (this.source) {
              if (creep.moveToRoom(this.source_info.room_name) == ActionResult.IN_PROGRESS) {
                return
              }
              if (creep.harvest(this.source!) == ERR_NOT_IN_RANGE) {
                const ignoreCreeps = false//((Game.time % 2) == 0) ? false : true
                moveToOps.ignoreCreeps = ignoreCreeps

                creep.moveTo(this.source, moveToOps)
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

      const carry = _.sum(creep.carry)

      if (creep.memory.status == CreepStatus.CHARGE) {
        if (carry == 0) {
          if (((creep.ticksToLive || 0) < 200) && this.region.worker_squad) {
            creep.memory.squad_name = this.region.worker_squad.name
            creep.memory.status = CreepStatus.CHARGE
            creep.memory.let_thy_die = true
            return
          }
          creep.memory.status = CreepStatus.HARVEST
        }
        else {
          const has_minerals = carry > creep.carry.energy

          if (!has_minerals && this.destination && this.destination.room.storage && (_.sum(this.destination.room.storage.store) > (this.destination.room.storage.storeCapacity * 0.9)) && (this.region.room.controller && this.region.room.controller.my)) {
            creep.moveTo(this.region.room.controller, moveToOps)
            creep.memory.status = CreepStatus.UPGRADE
            return
          }

          if (this.destination && ((this.destination.structureType == STRUCTURE_LINK) || (this.destination.structureType == STRUCTURE_SPAWN))) {
            if (has_minerals && this.destination.room.storage) {
              if (creep.transferResources(this.destination.room.storage) == ERR_NOT_IN_RANGE) {
                creep.moveTo(this.destination, moveToOps)
              }
            }
            else {
              if (creep.transfer(this.destination, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(this.destination, moveToOps)
              }
            }
            return
          }

            const result = creep.transferResources(this.destination)
            switch (result) {
              case ERR_NOT_IN_RANGE:
                if (this.destination && (creep.moveToRoom(this.destination.room.name) == ActionResult.IN_PROGRESS)) {
                  const damaged_structure = creep.pos.findInRange(FIND_STRUCTURES, 3, {
                    filter: (structure: AnyStructure) => {
                      if (structure.hits > (structure.hitsMax * 0.5)) {
                        return false
                      }
                      if (structure.structureType == STRUCTURE_ROAD) {
                        return true
                      }
                      if (structure.structureType == STRUCTURE_CONTAINER) {
                        return true
                      }
                      return false
                    }
                  })[0]
                  if (damaged_structure) {
                    creep.repair(damaged_structure)
                  }
                  return
                }
                creep.moveTo(this.destination, moveToOps)
                return

              case OK:
                break

              default: {
                const charge_target = creep.find_charge_target()

                if (charge_target) {
                  if (creep.transfer(charge_target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(charge_target, moveToOps)
                  }
                  return
                }
                else {
                  const construction_site = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES)
                  if (construction_site) {
                    creep.build(construction_site)
                    creep.moveTo(construction_site)
                  }
                  else if (this.region.room.controller && this.region.room.controller.my) {
                    creep.moveTo(this.region.room.controller, moveToOps)
                    creep.memory.status = CreepStatus.UPGRADE
                    return
                  }
                  else {
                    console.log(`LightweightHarvesterSquad.run unexpectedly found no my controller on ${this.region.room}`)
                  }
                }
                return
              }
            }
        }
      }

      if (creep.memory.status == CreepStatus.UPGRADE) {
        if ((creep.carry.energy == 0) || !this.region.room.controller || !this.region.room.controller.my) {
          creep.memory.status = CreepStatus.HARVEST
          return
        }

        creep.upgradeController(this.region.room.controller)
        creep.moveTo(this.region.room.controller)
        return
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
      additions = `, under attack`
    }

    return `${super.description()}, ${this.source_info.room_name}${additions}`
  }
}
