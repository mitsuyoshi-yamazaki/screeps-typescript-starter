import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, CreepActionResult, CreepType } from "classes/creep"

export interface HarvesterSquadMemory extends SquadMemory {
  readonly source_id: string
  readonly room_name: string
}

export class HarvesterSquad extends Squad {
  private harvester?: Creep
  private carriers: Creep[]

  constructor(readonly name: string, readonly source: {id: string, room_name: string}, readonly destination: StructureContainer | StructureStorage) {
    super(name)

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
      return SpawnPriority.NORMAL
    }
    if (this.carriers.length < 2) {
      return SpawnPriority.LOW
    }
    return SpawnPriority.NONE
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    if (!this.harvester) {
      const energy_unit = 550
      const energy_needed = Math.min((Math.floor(capacity / energy_unit) * energy_unit), energy_unit * 2)
      return energyAvailable > energy_needed
    }
    else {
      return false  // @fixme
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
    console.log(`addCarrier not implemented yet ${this.name}`)

    // const name = this.generateNewName()
    // const body: BodyPartConstant[] = [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE]
    // const memory: CreepMemory = {
    //   squad_name: this.name,
    //   status: CreepStatus.NONE,
    //   birth_time: Game.time,
    //   type: CreepType.SCOUT,
    // }

    // const result = spawnFunc(body, name, {
    //   memory: memory
    // })
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
      if (harvester.moveToRoom(this.source.room_name) != CreepActionResult.DONE) {
        return
      }

      const source = Game.getObjectById(this.source.id) as Source
      if (!source) {
        console.log(`HarvesterSquad.harvest no target source ${this.source.id}, ${this.name}`)
        return
      }
      if (harvester.harvest(source) == ERR_NOT_IN_RANGE) {
        harvester.moveTo(source)
        return
      }
    }

    // Charge
    if (harvester.memory.status == CreepStatus.CHARGE) {
      const target = harvester.pos.findInRange(FIND_STRUCTURES, 1, {
        filter: function(structure: Structure) {
          return structure.structureType == STRUCTURE_CONTAINER
        }
      })[0] as StructureContainer

      if (!target) {
        harvester.memory.status = CreepStatus.BUILD
      }
      else {
        harvester.transfer(target, RESOURCE_ENERGY)
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
        const source = Game.getObjectById(this.source.id) as Source

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
          console.log(`HarvesterSquad.harvest no target source ${this.source.id}, ${this.name}`)
          return
        }
      }
    }
  }

  private carry(): void {
    this.carriers.forEach((creep, _) => { // @todo:
    })
  }
}
