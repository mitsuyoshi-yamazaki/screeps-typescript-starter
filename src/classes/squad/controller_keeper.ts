import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, CreepActionResult } from "classes/creep"

export interface ControllerKeeperSquadMemory extends SquadMemory {
  readonly room_name: string
}

export class ControllerKeeperSquad extends Squad {
  constructor(readonly name: string, readonly room_name: string) {
    super(name)

    if (!room_name) {
      console.log(`ControllerKeeperSquad.room_name is not provided ${room_name}, ${this.name}`)
    }

    const room_obj = Game.rooms[this.room_name]
    if (!room_obj) {
      this.myRoom = false
    }
    else if (room_obj.controller) {
      this.myRoom = room_obj.controller!.my
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
        creep.upgrade(source, Game.rooms[this.room_name].controller!)
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

    console.log(`Spawn ${body} and assign to ${this.type}: ${result}`)
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
