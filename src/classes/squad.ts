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
  WORKER = "worker",
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

      this.creeps.set(creep.name, creep)
    }
  }

  public say(message: string): void {
    this.creeps.forEach((creep, _) => {
      creep.say(message)
    })
  }
}

export class ControllerKeeperSquad extends Squad {
  constructor(readonly name: string, readonly room: Room | string) {
    super(name)

    if ((this.room as Room).controller) {
      this.myRoom = (this.room as Room).controller!.my
    }
    else {
      this.myRoom = false
    }
  }

  public readonly myRoom: boolean

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

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    return energyAvailable >= 250
  }

  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    if (this.myRoom) {
      this.addCreepForUpgrade(spawnFunc)
    }
    else {
      this.addCreepForReserve(spawnFunc)
    }
  }

  public run(): void {
    if (this.myRoom) {
      this.creeps.forEach((creep, _) => {
      // const source = (this.room as Room).sources[0]  // @todo: Cache source
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
        creep.upgrade(source, (this.room as Room).controller!)
      })
    }
    else {
      this.reserveOrClaim()
    }
  }

  // Private members
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
        birth_time: Game.time,
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

  private reserveOrClaim(): void {
    // @todo: implement
    console.log(`reserveOrClaim not implemented yet`)
  }
}

/**
 * WorkerSquad manages workers ([WORK, CARRY, MOVE] * n or [WORK * 2, CARRY * 2, MOVE * 3] * n)
 * to build or upgrade.
 */
export class WorkerSquad extends Squad {
  constructor(readonly name: string, readonly rooms: (Room | string)[]) {
    super(name)
  }

  public get type(): SquadType {
    return SquadType.WORKER
  }

  public get spawnPriority(): SpawnPriority {
    const urgent = false  // @todo: no harvester or worker
    const needWorker = Object.keys(Game.creeps).length < 6  // @todo: implement

    if (urgent) {
      return SpawnPriority.URGENT
    }
    return needWorker ? SpawnPriority.LOW : SpawnPriority.NONE
  }

  public static generateNewName(): string {
    return `${SquadType.WORKER}${Game.time}`
  }

  public generateNewName(): string {
    return WorkerSquad.generateNewName()
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    let energyUnit = 450

    if (capacity < energyUnit) {
      energyUnit = 200
    }

    const energyNeeded = Math.floor(capacity / energyUnit) * energyUnit // @todo: set upper limit

    return energyNeeded <= energyAvailable
  }

  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    let energyUnit = 450
    let bodyUnit: BodyPartConstant[] = [WORK, CARRY, MOVE, WORK, CARRY, MOVE, MOVE]
    let body: BodyPartConstant[] = []
    const name = this.generateNewName()
    const memory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
    }

    if (energyAvailable < energyUnit) {
      energyUnit = 200
      bodyUnit = [WORK, CARRY, MOVE]
    }

    while (energyAvailable >= energyUnit) {
      body = body.concat(bodyUnit)
      energyAvailable -= energyUnit
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })

    console.log(`Spawn and assign to ${this.type}: ${result}`)
  }

  public run(): void {
    // @todo move harvest task to harvester squad

    const room = this.rooms[0] as Room  // @fixme

    this.creeps.forEach((creep, _) => {
      const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
      creep.charge(source, room)
    })
  }
}
