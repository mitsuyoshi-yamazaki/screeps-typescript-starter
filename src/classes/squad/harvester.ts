import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, CreepActionResult, CreepType } from "classes/creep"

export interface HarvesterSquadMemory extends SquadMemory {
  readonly source_id: string
  readonly room_name: string
}

export class HarvesterSquad extends Squad {
  private harvester?: Creep
  private carrier: Creep[]

  constructor(readonly name: string, readonly source: {id: string, room_name: string}, readonly destination: StructureContainer | StructureStorage) {
    super(name)

    this.carrier = []

    this.creeps.forEach((creep, _) => {
      switch (creep.memory.type) {
        case CreepType.HARVESTER:
          this.harvester = creep
          break

        case CreepType.CARRIER:
          this.carrier.push(creep)
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
    if (this.carrier.length < 2) {
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
    // @todo:
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
}
