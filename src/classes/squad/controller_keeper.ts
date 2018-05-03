import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, CreepActionResult } from "classes/creep"

export interface ControllerKeeperSquadMemory extends SquadMemory {
  readonly room_name: string
}

enum State {
  // OWNED     = 'owned', @fixme: how to distinguish it's owned?
  NOT_OWNED = 'not_owned',
  MINE      = 'mine',
}

export class ControllerKeeperSquad extends Squad {
  constructor(readonly name: string, readonly room_name: string) {
    super(name)

    if (!room_name) {
      console.log(`ControllerKeeperSquad.room_name is not provided ${room_name}, ${this.name}`)
    }

    const room = Game.rooms[this.room_name]
    if (!room) {
      this.myRoom = false
    }
    else if (room.controller) {
      this.myRoom = room.controller!.my
    }
    else {
      this.myRoom = false
    }

    if (this.myRoom) {
      this.state = State.MINE
    }
    else {
      this.state = State.NOT_OWNED
    }
  }

  public readonly myRoom: boolean
  private readonly state: State

  public get type(): SquadType {
    return SquadType.CONTROLLER_KEEPER
  }

  public static generateNewName(): string {
    return `${SquadType.CONTROLLER_KEEPER}${Game.time}`
  }

  public generateNewName(): string {
    return ControllerKeeperSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    if (this.creeps.size == 0) {
      return SpawnPriority.NORMAL
    }
    return SpawnPriority.NONE
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    switch (this.state) {
    case State.NOT_OWNED:
      // if (capacity >= 1250) {  // @todo implement here with addCreepForClaim
      //   return energyAvailable >= 1250
      // }
      // else {
        return energyAvailable >= 650
      // }

    case State.MINE:
      return energyAvailable >= 250

    default:
      console.log(`Unexpected state ${this.state}, ${this.name}`)
      return false
    }
  }

  // --
  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    switch (this.state) {
      case State.NOT_OWNED:
        this.addCreepForClaim(spawnFunc)
        break

      case State.MINE:
        this.addCreepForUpgrade(spawnFunc)
        break

      default:
        console.log(`Unexpected state ${this.state}, ${this.name}`)
        break
    }
  }

  public run(): void {
    switch (this.state) {
      case State.NOT_OWNED:
        this.claim()
        break

      case State.MINE:
        this.upgrade()
        break

      default:
        console.log(`Unexpected state ${this.state}, ${this.name}`)
        break
    }
  }

  // Private members
  private addCreepForUpgrade(spawnFunc: SpawnFunction): void {
    const body: BodyPartConstant[] = [WORK, CARRY, MOVE, MOVE]
    const name = this.generateNewName()
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
    }

    const result = spawnFunc(body, name, {
      memory: memory,
    })

    console.log(`Spawn [${body}] and assign to ${this.name}: ${result}`)
  }

  private addCreepForClaim(spawnFunc: SpawnFunction): void {
    const body: BodyPartConstant[] = [CLAIM, MOVE]
    const name = this.generateNewName()
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })

    console.log(`Spawn [${body}] and assign to ${this.name}: ${result}`)
  }

  private upgrade(): void {
    this.creeps.forEach((creep, _) => {
      // const source = (this.room as Room).sources[0]  // @todo: Cache source
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
        creep.upgrade(source, Game.rooms[this.room_name].controller!)
    })
  }

  private claim(): void {
    this.creeps.forEach((creep, _) => {
      creep.claim(this.room_name)
    })
  }
}
