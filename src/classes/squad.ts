import { Reply } from "interfaces"
import { CreepStatus } from "classes/creep"

enum Status {
  HARVEST = "harvest",
  UPGRADE = "upgrade",
}

export enum SpawnPriority {
  URGENT = 0,
  NORMAL = 1,
  LOW    = 2,
  NONE   = 3, // no need to spawn creeps
}

export enum SquadType {
  CONTROLLER_KEEPER = "controller_keeper",
}

export interface SpawnFunction {
  (body: BodyPartConstant[], name: string, opts?: { memory?: CreepMemory, energyStructures?: Array<(StructureSpawn | StructureExtension)>, dryRun?: boolean }): ScreepsReturnCode
}

export class Squad {
  public readonly creeps = new Map<string, Creep>()

  public readonly spawnPriority: SpawnPriority = SpawnPriority.NONE

  // Methods
  public static generateNewID(type: SquadType): string {
    return `${type}${Game.time}`
  }

  public generateNewID(): string {
    return Squad.generateNewID(this.type)
  }

  constructor(readonly id: string, readonly type: SquadType) {
    for (const creep_name in Game.creeps) {
      const creep = Game.creeps[creep_name]
      if (creep.memory.squad_id != id) {
        continue
      }

      this.creeps.set(creep.id, creep)
    }

    // priority
    switch (type) {
    case SquadType.CONTROLLER_KEEPER:
      if (this.creeps.size == 0) {
        this.spawnPriority = SpawnPriority.NORMAL
      }
      break
    }
  }

  public addCreep(spawnFunc: SpawnFunction) {
    let body: BodyPartConstant[] = []
    let name: string
    let memory: CreepMemory

    switch (this.type) {
    case SquadType.CONTROLLER_KEEPER:
    default:
      body = [WORK, CARRY, MOVE, MOVE]
      name = this.generateNewID()
      memory = {
        squad_id: this.id,
        status: CreepStatus.NONE,
      }
      break
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })

    console.log(`Spawn and assign to ${this.type}: ${result}`)
  }

  public say(message: string): void {
    this.creeps.forEach((creep, _) => {
      creep.say(message)
    })
  }

  public harvest(source: Source): void {
    console.log(`Harvest ${source}`)

    this.creeps.forEach((creep, _) => {
      // creep.say(message)
    })
  }

  public upgrade(sources: Source[], target: StructureController): void {
    console.log(`Upgrade ${target}`)

    this.creeps.forEach((creep, _) => {
      creep.upgrade(sources[0], target)
    })
  }
}
