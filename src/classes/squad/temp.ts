import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export class TempSquad extends Squad {
  constructor(readonly name: string, readonly room_name: string, readonly target_room_name: string) {
    super(name)
  }

  public get type(): SquadType {
    return SquadType.TEMP
  }

  public static generateNewName(): string {
    return UID('T')
  }

  public generateNewName(): string {
    return TempSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    if (!this.target_room_name) {
      return SpawnPriority.NONE
    }

    const room = Game.rooms[this.target_room_name]

    if (room && room.controller && room.controller.my) {
      return SpawnPriority.NONE
    }

    return this.creeps.size < 1 ? SpawnPriority.NORMAL : SpawnPriority.NONE
    // return SpawnPriority.NONE

  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    let energy = (capacity >= 850) ? 850 : 750
    if (this.room_name == 'W47N2') {
      energy = 1300
    }
    return energy_available >= energy
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    this.addCreepForClaim(energy_available, spawn_func)
  }

  private addCreepForClaim(energyAvailable: number, spawnFunc: SpawnFunction): void {
    let body: BodyPartConstant[] = (energyAvailable >= 850) ? [MOVE, MOVE, MOVE, MOVE, MOVE, CLAIM] : [MOVE, MOVE, MOVE, CLAIM]
    const name = this.generateNewName()
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.CLAIMER,
      should_notify_attack: false,
      let_thy_die: true,
    }

    if (this.room_name == 'W47N2') {
      body = [
        MOVE, CLAIM, CLAIM, MOVE,
      ]
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  public run():void {
    if (!this.target_room_name) {
      this.say(`ERR`)
      return
    }
    const target_room_name = this.target_room_name

    this.creeps.forEach((creep) => {
      if (creep.moveToRoom(target_room_name) == ActionResult.IN_PROGRESS) {
        return
      }

      creep.claim(target_room_name, true)

      if (((Game.time % 41) == 1) && (creep.room.name == target_room_name) && creep.room.controller) {
        if (!creep.room.controller.sign || (Memory.versions.indexOf(creep.room.controller.sign.text) < 0)) {
          creep.signController(creep.room.controller, Game.version)
        }
      }
    })
  }

  public description(): string {
    const addition = this.creeps.size > 0 ? `, ${Array.from(this.creeps.values())[0].pos}` : ''
    return `${super.description()} ${addition}`
  }
}
