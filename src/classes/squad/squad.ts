import { CreepStatus, CreepActionResult } from "classes/creep"

export enum SpawnPriority {
  URGENT = 0,
  NORMAL = 1,
  LOW    = 2,
  NONE   = 3, // no need to spawn creeps
}

export enum SquadType {
  CONTROLLER_KEEPER = "controller_keeper",
  WORKER            = "worker",
  HARVESTER         = "harvester",
  MANUAL            = "manual",
}

export interface SpawnFunction {
  (body: BodyPartConstant[], name: string, opts?: { memory?: CreepMemory, energyStructures?: Array<(StructureSpawn | StructureExtension)>, dryRun?: boolean }): ScreepsReturnCode
}

export interface SquadMemory {
  readonly name: string
  readonly type: SquadType
  readonly owner_name: string  // Spawn name
}

/**
 * 1 ControllerKeeperSquad for each rooms
 * 1 WorkerSquad for each spawn
 */
export abstract class Squad {
  // Abstract members
  // public abstract readonly memory: SquadMemory // @todo: implement
  public abstract readonly type: SquadType
  public abstract readonly spawnPriority: SpawnPriority
  public abstract hasEnoughEnergy(energyAvailable: number, capacity: number): boolean
  public abstract addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void
  // public static abstract generateNewName(): string // this method should be implemented each subclasses
  public abstract generateNewName(): string
  public abstract run(): void

  // Non-abstract members
  public readonly creeps = new Map<string, Creep>()

  // Methods
  constructor(readonly name: string) {
    for (const creep_name in Game.creeps) {
      const creep = Game.creeps[creep_name]
      if (creep.memory.squad_name != name) {
        continue
      }

      creep.initialize()
      this.creeps.set(creep.name, creep)
    }
  }

  public say(message: string): void {
    this.creeps.forEach((creep, _) => {
      creep.say(message)
    })
  }
}
