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

export enum SquadStatus {
  NONE    = 'none',
  BUILD   = 'build',
  HARVEST = 'harvest',
  ESCAPE  = 'escape',
}

export interface SpawnFunction {
  (body: BodyPartConstant[], name: string, opts?: { memory?: CreepMemory, energyStructures?: Array<(StructureSpawn | StructureExtension)>, dryRun?: boolean }): ScreepsReturnCode
}

export interface SquadMemory {
  name: string
  type: SquadType
  owner_name: string  // Spawn name
  stop_spawming?: boolean
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
    const priority = Memory.squads[this.name].stop_spawming ? 'stop' : `${this.spawnPriority}`
    return `${this.name} ${this.creeps.size} crp, pri: ${priority}`
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

  public hasEnoughEnergyForUpgrader(energyAvailable: number, capacity: number, max_energy?: number): boolean {
    capacity = Math.min(capacity, 2150)

    const energy_unit = 250
    const energyNeeded = (Math.floor((capacity - 150) / energy_unit) * energy_unit)
    return energyAvailable >= energyNeeded
  }

  public addUpgrader(energyAvailable: number, spawnFunc: SpawnFunction, max_energy?: number): void {
    // capacity: 2150
    // 8 units, 2C, 16W, 9M

    max_energy = max_energy || 2300
    const upgraded = max_energy > 2300

    energyAvailable = Math.min(energyAvailable, max_energy)

    const move: BodyPartConstant[] = [MOVE]
    const work: BodyPartConstant[] = [WORK, WORK]
    const energy_unit = 250

    energyAvailable -= upgraded ? 350 : 150
    const header: BodyPartConstant[] = upgraded ? [WORK, CARRY, CARRY, CARRY] : [CARRY, CARRY]
    let body: BodyPartConstant[] = upgraded ? [MOVE, MOVE] : [MOVE]
    const name = this.generateNewName()
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.WORKER,
      should_notify_attack: false,
      let_thy_die: true,
    }

    while (energyAvailable >= energy_unit) {
      body = move.concat(body)
      body = body.concat(work)
      energyAvailable -= energy_unit
    }
    body = header.concat(body)

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  public hasEnoughEnergyForLightWeightHarvester(energy_available: number, capacity: number): boolean {
    const energy_unit = 450

    const energy_needed = Math.min(Math.floor(capacity / energy_unit) * energy_unit, 2250)
    return energy_available >= energy_needed
  }

  public addLightWeightHarvester(energy_available: number, spawn_func: SpawnFunction): void {
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
      should_notify_attack: false,
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
}
