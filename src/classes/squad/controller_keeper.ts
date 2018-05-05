import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export interface ControllerKeeperSquadMemory extends SquadMemory {
  readonly room_name: string
}

enum State {
  OWNED     = 'owned',
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
    const max = 1

    if (this.creeps.size < max) {
      return SpawnPriority.LOW
    }
    return SpawnPriority.NONE
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    switch (this.state) {
    case State.OWNED:
      return energyAvailable >= 700

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
      case State.OWNED:
        this.addCreepForAttack(spawnFunc)
        break

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
      case State.OWNED:
        this.attack()
        break

      case State.NOT_OWNED:
        // console.log(`HOGE ${this.name}, ${this.room_name}, ${this.state}, ${this.creeps.size}`)
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
      type: CreepType.CONTROLLER_KEEPER,
    }

    const result = spawnFunc(body, name, {
      memory: memory,
    })
  }

  private addCreepForClaim(spawnFunc: SpawnFunction): void {
    const body: BodyPartConstant[] = [CLAIM, MOVE]
    const name = this.generateNewName()
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.CLAIMER,
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  private addCreepForAttack(spawnFunc: SpawnFunction): void {
    const name = this.generateNewName()
    const body: BodyPartConstant[] = [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE]
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.SCOUT,
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  private attack(): void {
    this.creeps.forEach((creep, _) => {
      // creep.moveTo(42, 20)
      // console.log(`Moving left ${creep.name}`)
      // return

      const target_room_name = 'W44S42' // @fixme: use this.room_name

      if (creep.moveToRoom(target_room_name) != ActionResult.DONE) {
        return
      }

      const target = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES)
      creep.drop(RESOURCE_ENERGY)

      if (creep.dismantle(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target)
      }
    })
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
      if (creep.claim(this.room_name) == ActionResult.DONE) {
        console.log(`CLAIMED ANOTHER ROOM ${this.room_name}`)
      }
    })
  }
}
