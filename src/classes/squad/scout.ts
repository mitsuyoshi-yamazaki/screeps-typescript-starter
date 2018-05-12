import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

interface ScoutCreepMemory extends CreepMemory {
  readonly room_name: string
}

export class ScoutSquad extends Squad {
  private creep_for_room = new Map<string, Creep>()

  constructor(readonly name: string, readonly room_names: string[]) {
    super(name)

    this.creeps.forEach((creep) => {
      const memory = creep.memory as ScoutCreepMemory
      if (!memory.room_name) {
        console.log(`ScoutSquad creep doesn't have room name ${creep.name}, ${this.name}`)
        return
      }
      this.creep_for_room.set(memory.room_name, creep)
    })
  }

  public get type(): SquadType {
    return SquadType.SCOUT
  }

  public static generateNewName(): string {
    return UID(SquadType.SCOUT)
  }

  public generateNewName(): string {
    return ScoutSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    const needs_spawn = this.creep_for_room.size < this.room_names.length
    return needs_spawn ? SpawnPriority.NORMAL : SpawnPriority.NONE
    // return SpawnPriority.NONE // @fixme: temp
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    return energyAvailable > 50
  }

  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    const room_needs_scout = this.room_names.filter((name) => {
      return !this.creep_for_room.get(name)
    })
    if (room_needs_scout.length == 0) {
      console.log(`ScoutSquad.addCreep no room that needs scout ${this.name}, ${this.room_names}`)
      return
    }

    const body: BodyPartConstant[] = [MOVE]
    const name = this.generateNewName()
    const memory: ScoutCreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.CLAIMER,
      room_name: room_needs_scout[0],
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  public run(): void {
    this.creep_for_room.forEach((creep, room_name) => {
      if (creep.moveToRoom(room_name) == ActionResult.IN_PROGRESS) {
        return
      }
      if (creep.pos.x == 1) {
        if (creep.move(RIGHT) == OK) {
          return
        }
      }
      if (creep.pos.x == 48) {
        if (creep.move(LEFT) == OK) {
          return
        }
      }
      if (creep.pos.y == 1) {
        if (creep.move(BOTTOM) == OK) {
          return
        }
      }
      if (creep.pos.y == 48) {
        if (creep.move(TOP) == OK) {
          return
        }
      }
    })
  }

  public description(): string {
    return `${super.description()}, ${this.room_names}`
  }
}
