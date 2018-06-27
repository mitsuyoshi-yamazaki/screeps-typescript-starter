import { UID } from "classes/utils"
import { CreepStatus, CreepType, ActionResult } from "classes/creep"

export enum SpawnPriority {
  URGENT = 0,
  HIGH   = 1,
  NORMAL = 2,
  LOW    = 3,
  NONE   = 4, // no need to spawn creeps
}

export enum SquadType {
  CONTROLLER_KEEPER = "controller_keeper",
  WORKER            = "worker",
  UPGRADER          = "upgrader",
  CHARGER           = "charger",
  BOOSTED_UPGRADER  = "boosted_upgrader",
  HARVESTER         = "harvester",
  REMOET_HARVESTER  = "remote_harvester",
  LIGHTWEIGHT_HARVESTER = "lightweight_harvester",
  RESEARCHER        = "researcher",
  MANUAL            = "manual",
  SCOUT             = 'scout',
  ATTACKER          = 'attacker',
  RAIDER            = 'raider',
  INVADER           = 'invader',
  GUARD             = 'guard',
  TEMP              = "temp",
}

export interface SpawnFunction {
  (body: BodyPartConstant[], name: string, opts?: { memory?: CreepMemory, energyStructures?: Array<(StructureSpawn | StructureExtension)>, dryRun?: boolean }): ScreepsReturnCode
}

export interface SquadMemory {
  name: string
  type: SquadType
  owner_name: string  // Spawn name
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
  public abstract hasEnoughEnergy(energy_available: number, capacity: number): boolean
  public abstract addCreep(energy_available: number, spawn_func: SpawnFunction): void
  // public static abstract generateNewName(): string // this method should be implemented each subclasses
  public abstract generateNewName(): string
  public abstract run(): void

  // Non-abstract members
  public readonly creeps = new Map<string, Creep>()

  // public set memory(value: SquadMemory): void {

  // }
  // public get memory(): SquadMemory {

  // }

  // Methods
  constructor(readonly name: string) {
    for (const creep_name in Game.creeps) {
      const creep = Game.creeps[creep_name]
      if (creep.memory.squad_name != name) {
        continue
      }

      creep.squad = this
      creep.initialize()
      this.creeps.set(creep.name, creep)
    }
  }

  public description(): string {
    return `${this.name} ${this.creeps.size} crp, pri: ${this.spawnPriority}`
  }

  public say(message: string): void {
    this.creeps.forEach((creep, _) => {
      creep.say(message)
    })
  }

  // --- Utility
  public addGeneralCreep(spawn_func: SpawnFunction, body: BodyPartConstant[], type: CreepType, should_live?: boolean): void {
    if (!should_live) {
      should_live = false
    }

    const name = this.generateNewName()
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: type,
      should_notify_attack: false,
      let_thy_die: !should_live,
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }
}
