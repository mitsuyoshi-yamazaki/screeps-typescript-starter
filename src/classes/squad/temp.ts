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
    const energy = (capacity >= 850) ? 850 : 750
    return energy_available >= energy
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    this.addCreepForClaim(energy_available, spawn_func)
  }

  private addCreepForClaim(energyAvailable: number, spawnFunc: SpawnFunction): void {
    const body: BodyPartConstant[] = (energyAvailable >= 850) ? [MOVE, MOVE, MOVE, MOVE, MOVE, CLAIM] : [MOVE, MOVE, MOVE, CLAIM]
    const name = this.generateNewName()
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.CLAIMER,
      should_notify_attack: false,
      let_thy_die: true,
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
    })
  }

  public description(): string {
    const addition = this.creeps.size > 0 ? `, ${Array.from(this.creeps.values())[0].pos}` : ''
    return `${super.description()} ${addition}`
  }

  // ----
  private addWorker(energyAvailable: number, spawnFunc: SpawnFunction): void {
    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      CARRY, MOVE, CARRY, MOVE,
      CARRY, MOVE, CARRY, MOVE,
      WORK, MOVE, WORK, MOVE, WORK, MOVE,
      WORK, MOVE, WORK, MOVE,
      CARRY, MOVE, CARRY, MOVE,
      WORK, MOVE,
    ]
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.WORKER,
      should_notify_attack: false,
      let_thy_die: false,
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  public addHarvester(energy_available: number, spawn_func: SpawnFunction): void {
    const body_unit: BodyPartConstant[] = [WORK, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE]
    const energy_unit = 450
    energy_available = Math.min(energy_available, 1350)

    const name = this.generateNewName()
    let body: BodyPartConstant[] = []
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.HARVESTER,
      should_notify_attack: false,
      let_thy_die: false,
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
