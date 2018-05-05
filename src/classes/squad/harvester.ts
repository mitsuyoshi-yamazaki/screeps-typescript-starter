import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export interface HarvesterSquadMemory extends SquadMemory {
  readonly source_id: string
  readonly room_name: string
}

export class HarvesterSquad extends Squad {
  private harvester?: Creep
  private carriers: Creep[]
  private source?: Source
  private container?: StructureContainer

  constructor(readonly name: string, readonly source_info: {id: string, room_name: string}, readonly destination: StructureContainer | StructureStorage) {
    super(name)

    if (!destination) {
      console.log(`HarvesterSquad destination not specified ${this.name}`)
    }

    this.carriers = []

    this.creeps.forEach((creep, _) => {
      switch (creep.memory.type) {
        case CreepType.HARVESTER:
          this.harvester = creep
          break

        case CreepType.CARRIER:
          this.carriers.push(creep)
          break

        default:
          console.log(`Unexpected creep type ${creep.memory.type}, ${this.name}`)
          break
      }
    })

    this.get_sources()
  }

  private get_sources(): void {
    const source = Game.getObjectById(this.source_info.id) as Source
    if (!source) {
      return
    }
    this.source = source
    // console.log(`Find source ${source.id} ${source.pos.x}, ${source.pos.y}`)

    const container = this.source.pos.findInRange(FIND_STRUCTURES, 2, {
      filter: function(structure: Structure) {
        return structure.structureType == STRUCTURE_CONTAINER
      }
    })[0] as StructureContainer

    if (!container) {
      return
    }
    this.container = container
    // console.log(`Find container ${container.id} ${container.pos.x}, ${container.pos.y}`)
  }

  public get type(): SquadType {
    return SquadType.HARVESTER
  }

  public static generateNewName(): string {
    return `${SquadType.HARVESTER}${Game.time}`
  }

  public generateNewName(): string {
    return HarvesterSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    if (!this.harvester) {
      return SpawnPriority.HIGH
    }

    const number_of_carriers = 1//(this.destination.room.name == this.source_info.room_name) ? 1 : 2

    if ((this.container) && (this.carriers.length < number_of_carriers)) {
      return SpawnPriority.NORMAL
    }
    return SpawnPriority.NONE
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    if (!this.harvester) {
      const energy_unit = 550
      const energy_needed = Math.min((Math.floor(capacity / energy_unit) * energy_unit), energy_unit * 2)
      return energyAvailable >= energy_needed
    }
    else {
      // return false  // @fixme:
      const energy_unit = 100
      const energy_needed = Math.min((Math.floor(capacity / energy_unit) * energy_unit), 1200)

      return energyAvailable >= energy_needed
    }
  }

  // --
  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    if (!this.harvester) {
      this.addHarvester(energyAvailable, spawnFunc)
    }
    else {
      this.addCarrier(energyAvailable, spawnFunc)
    }
  }

  public run(): void {
    this.harvest()
    this.carry()
  }

  // Private
  private addHarvester(energyAvailable: number, spawnFunc: SpawnFunction): void {
    const body_unit: BodyPartConstant[] = [WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE]
    const energy_unit = 550

    const name = this.generateNewName()
    let body: BodyPartConstant[] = body_unit
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.HARVESTER,
    }

    if (energyAvailable >= (energy_unit * 2)) {
      body = body.concat(body_unit)
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  private addCarrier(energyAvailable: number, spawnFunc: SpawnFunction): void {
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

    energyAvailable = Math.min(energyAvailable, 1200)

    while (energyAvailable >= energy_unit) {
      body = body.concat(body_unit)
      energyAvailable -= energy_unit
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  private harvest(): void {
    const harvester = this.harvester!

    if (!harvester) {
      return
    }
    if ((harvester.memory.status == CreepStatus.NONE) || (harvester.carry.energy == 0)) {
      harvester.memory.status = CreepStatus.HARVEST
    }

    // Harvest
    if ((harvester.memory.status == CreepStatus.HARVEST) && (harvester.carry.energy == harvester.carryCapacity)) {
      harvester.memory.status = CreepStatus.CHARGE
    }

    if (harvester.memory.status == CreepStatus.HARVEST) {
      if (harvester.moveToRoom(this.source_info.room_name) != ActionResult.DONE) {
        return
      }

      if (!this.source) {
        console.log(`HarvesterSquad.harvest no target source ${this.source_info.id}, ${this.name}`)
        return
      }
      if (harvester.harvest(this.source!) == ERR_NOT_IN_RANGE) {
        harvester.moveTo(this.source!)
        return
      }
    }

    // Charge
    if (harvester.memory.status == CreepStatus.CHARGE) {
      if (!this.container) {
        harvester.memory.status = CreepStatus.BUILD
      }
      else if (this.container!.hits < this.container!.hitsMax) {
        harvester.repair(this.container!)
        return
      }
      else {
        if (harvester.transfer(this.container!, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          harvester.moveTo(this.container!)
          return
        }
        harvester.memory.status = CreepStatus.HARVEST
        return
      }
    }

    // Build
    if (harvester.memory.status == CreepStatus.BUILD) {
      const target = harvester.pos.findInRange(FIND_CONSTRUCTION_SITES, 1)[0] as ConstructionSite

      if (target) {
        const result = harvester.build(target)
        if (result != OK) {
          console.log(`HarvesterSquad.harvest build failed ${result}, ${this.name}`)
          return
        }
      }
      else {
        const source = Game.getObjectById(this.source_info.id) as Source

        if (source) {
          const x_diff = harvester.pos.x - source.pos.x
          const y_diff = harvester.pos.y - source.pos.y
          const pos = {
            x: harvester.pos.x + x_diff,
            y: harvester.pos.y + y_diff,
          }

          const result = harvester.room.createConstructionSite(pos.x, pos.y, STRUCTURE_CONTAINER)
          console.log(`HarvesterSquad place container on ${pos} at ${harvester.room.name}, ${this.name}`)
          harvester.memory.status = CreepStatus.HARVEST // @todo: more optimized way
          return
        }
        else {
          console.log(`HarvesterSquad.harvest no target source ${this.source_info.id}, ${this.name}`)
          return
        }
      }
    }
  }

  private carry(): void {
    this.carriers.forEach((creep, _) => {
      const needs_renew = (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || ((creep.ticksToLive || 0) < 400)

      if (needs_renew) {
        if (creep.room.spawns.length > 0 && !creep.room.spawns[0].spawning && (creep.room.energyAvailable > 50)) {
          creep.goToRenew(creep.room.spawns[0])
          return
        }
      }

      if ((creep.memory.status == CreepStatus.NONE) || (creep.carry.energy == 0)) {
        creep.memory.status = CreepStatus.HARVEST
      }

      // Harvest
      if (creep.memory.status == CreepStatus.HARVEST) {
        if (creep.carry.energy == creep.carryCapacity) {
          creep.memory.status = CreepStatus.CHARGE
        }
        else if (creep.moveToRoom(this.source_info.room_name) != ActionResult.DONE) {
          return
        }
        else if (creep.withdraw(this.container!, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(this.container!)
        }
      }

      // Charge
      if (creep.memory.status == CreepStatus.CHARGE) {
        if (creep.carry.energy == 0) {
          creep.memory.status = CreepStatus.HARVEST
        }
        else if (creep.transfer(this.destination, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(this.destination)
        }
      }
    })
  }
}
