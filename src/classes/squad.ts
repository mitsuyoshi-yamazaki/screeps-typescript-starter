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

export abstract class Squad {
  // Abstract members
  public abstract readonly type: SquadType
  public abstract readonly spawnPriority: SpawnPriority
  public abstract hasEnoughEnergy(energyAvailable: number, capacity: number): boolean
  public abstract addCreep(spawnFunc: SpawnFunction): void
  // public static abstract generateNewName(): string // this method should be implemented each subclasses
  public abstract generateNewName(): string

  // Non-abstract members
  public readonly creeps = new Map<string, Creep>()

  // Methods
  constructor(readonly name: string) {
    for (const creep_name in Game.creeps) {
      const creep = Game.creeps[creep_name]
      if (creep.memory.squad_name != name) {
        continue
      }

      this.creeps.set(creep.name, creep)
    }
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

export class ControllerKeeperSquad extends Squad {
  get myRoom(): boolean {
    if ((this.room as Room).controller) {
      return (this.room as Room).controller!.my
    }
    return false
  }

  public get type(): SquadType {
    return SquadType.CONTROLLER_KEEPER
  }

  public get spawnPriority(): SpawnPriority {
    if (this.creeps.size == 0) {
      return SpawnPriority.NORMAL
    }
    return SpawnPriority.NONE
  }

  public static generateNewName(): string {
    return `${SquadType.CONTROLLER_KEEPER}${Game.time}`
  }

  public generateNewName(): string {
    return ControllerKeeperSquad.generateNewName()
  }

  constructor(readonly name: string, readonly room: Room | string) {
    super(name)

    if ((room as Room).keeper != undefined) {
      (room as Room).keeper = this
    }
    else {
      console.log('(room as Room).keeper is undefined')
    }
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    return energyAvailable >= 200
  }

  public addCreep(spawnFunc: SpawnFunction): void {
    if (this.myRoom) {
      this.addCreepForUpgrade(spawnFunc)
    }
    else {
      this.addCreepForReserve(spawnFunc)
    }
  }

  private addCreepForUpgrade(spawnFunc: SpawnFunction): void {
    let body: BodyPartConstant[] = []
    let name: string
    let memory: CreepMemory

    switch (this.type) {
    case SquadType.CONTROLLER_KEEPER:
    default:
      body = [WORK, CARRY, MOVE, MOVE]
      name = this.generateNewName()
      memory = {
        squad_name: this.name,
        status: CreepStatus.NONE,
      }
      break
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })

    console.log(`Spawn and assign to ${this.type}: ${result}`)
  }

  private addCreepForReserve(spawnFunc: SpawnFunction): void {
    // @todo: implement
    console.log(`addCreepForReserve not implemented yet`)
  }
}
