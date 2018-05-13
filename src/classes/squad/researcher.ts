import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export interface ResearchTarget {
  readonly id: string
  readonly resource_type: ResourceConstant
}

// @todo: merge to worker
export class ResearcherSquad extends Squad {
  constructor(readonly name: string, readonly room_name: string, readonly input_targets: ResearchTarget[], output_targets: ResearchTarget[]) {
    super(name)
  }

  public get type(): SquadType {
    return SquadType.RESEARCHER
  }

  public static generateNewName(): string {
    return UID(SquadType.RESEARCHER)
  }

  public generateNewName(): string {
    return ResearcherSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    if (['W49S47', 'W44S42'].indexOf(this.room_name) >= 0) {
      return SpawnPriority.NONE
    }

    return this.creeps.size > 0 ? SpawnPriority.NONE : SpawnPriority.LOW
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    const energy_unit = 100
    const energy_needed = Math.min(Math.floor(capacity / energy_unit) * energy_unit, 1000)
    return energy_available >= energy_needed
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    const body_unit: BodyPartConstant[] = [CARRY, MOVE]
    const energy_unit = 100

    const name = this.generateNewName()
    let body: BodyPartConstant[] = []
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.CARRIER,
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
    this.creeps.forEach((creep) => {
      if (creep.room.name != this.room_name) {
        creep.moveToRoom(this.room_name)
        return
      }

      const needs_renew = (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || ((creep.ticksToLive || 0) < 300)

      if (needs_renew) {
        if ((creep.room.spawns.length > 0) && (creep.room.energyAvailable > 0)) {
          creep.goToRenew(creep.room.spawns[0])
          return
        }
        else if (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) {
          creep.memory.status = CreepStatus.HARVEST
        }
      }

      if (creep.memory.status == CreepStatus.NONE) {
        creep.memory.status = CreepStatus.HARVEST
      }
    })

    let room_resource: ResourceConstant | undefined // @fixme: temp code
    switch (this.room_name) {
      case 'W48S47':
        room_resource = RESOURCE_OXYGEN
        break

      case 'W49S47':
        room_resource = RESOURCE_UTRIUM
        break

      case 'W44S42':
        room_resource = RESOURCE_HYDROGEN
        break
    }

    if (!room_resource) {
      console.log(`ResearcherSquad.run room_resource not defined for ${this.room_name}, ${this.name}`)
    }
    else {
      const room = Game.rooms[this.room_name]!
      const terminal_needs_resource = (room.terminal!.store[room_resource] || 0) < 5000
      const storage_has_resource = (room.storage!.store[room_resource] || 0) > 0

      if (terminal_needs_resource && storage_has_resource) {
        this.transferRoomResource(room_resource)
        return
      }
    }

    this.chargeLabs()
  }

  // --- Private ---
  private transferRoomResource(resource_type: ResourceConstant): void {
    this.creeps.forEach((creep) => {
      if (creep.memory.status == CreepStatus.HARVEST) {
        if (_.sum(creep.carry) == creep.carryCapacity) {
          creep.memory.status = CreepStatus.CHARGE
        }
        else if (creep.withdraw(creep.room.storage!, resource_type) == ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.storage!)
        }
      }
      if (creep.memory.status == CreepStatus.CHARGE) {
        if (creep.carrying_resources.length == 0) {
          creep.memory.status = CreepStatus.HARVEST
        }
        else {
          const carrying_resource_type = creep.carrying_resources[0]
          const transfer_result = creep.transfer(creep.room.terminal!, carrying_resource_type)

          switch (transfer_result) {
            case OK:
              break

            case ERR_NOT_IN_RANGE:
              creep.moveTo(creep.room.terminal!)
              break

            default:
              console.log(`ResearcherSquad.transferRoomResource transfer failed with ${transfer_result}, ${this.name}, ${this.room_name}`)
              break
          }
        }
      }
    })
  }

  private chargeLabs() {
    this.creeps.forEach((creep) => {
      creep.say(`😴`)

    //   if (creep.memory.status == CreepStatus.HARVEST) {

    //     // if input target needs resource
    //     // or no input target, charge

    //     let resource_amounts = new Map<ResourceConstant, number>()

    //     this.input_targets.forEach((target) => {
    //       const lab = Game.getObjectById(target.id) as StructureLab
    //       if (!lab) {
    //         console.log(`ResearcherSquad.run lab not found ${target.id}, ${target.resource_type}, ${this.name}, ${this.room_name}`)
    //         return
    //       }

    //       const energy_shortage = lab.energyCapacity - lab.energy
    //       resource_amounts.set(RESOURCE_ENERGY, (resource_amounts.get(RESOURCE_ENERGY) || 0) + energy_shortage)

    //       if (lab.mineralType == target.resource_type) {
    //         const mineral_shortage = lab.mineralCapacity - lab.mineralAmount
    //         resource_amounts.set(target.resource_type, (resource_amounts.get(target.resource_type) || 0) + mineral_shortage)
    //       }
    //     })

    //     const harvest_result = creep.harvest()
    //   }
    //   if (creep.memory.status == CreepStatus.CHARGE) {
    //     // if resource_type unmatch, withdraw them
    //   }
    })
  }
}
