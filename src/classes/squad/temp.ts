import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

interface TempSquadMemory extends CreepMemory {
  arrived: boolean
}

export class TempSquad extends Squad {
  private claimer: Creep | undefined
  private attacker: Creep[] = []

  constructor(readonly name: string, readonly room_name: string, readonly target_room_name: string, readonly need_attacker: boolean) {
    super(name)

    this.creeps.forEach((creep, _) => {
      switch (creep.memory.type) {
        case CreepType.CLAIMER:
          this.claimer = creep
          break

        case CreepType.ATTACKER:
          this.attacker.push(creep)
          break

        default:
          console.log(`TempSquad unexpected creep type ${creep.memory.type}, ${this.name}`)
          break
      }
    })
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

    if (this.need_attacker && (this.attacker.length < 1)) {
      if (room && room.controller && (room.controller.level < 5)) {
        return SpawnPriority.NORMAL
      }
    }

    if (this.attacker[0] && this.attacker[0].spawning) {
      return SpawnPriority.NONE
    }

    if (room && room.controller && room.controller.my) {
      return SpawnPriority.NONE
    }

    return !this.claimer ? SpawnPriority.NORMAL : SpawnPriority.NONE
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    if (this.need_attacker && (this.attacker.length < 1)) {
      return this.hasEnoughEnergyForGeneralAttacker(energy_available, capacity)
    }

    let energy = (capacity >= 850) ? 850 : 750
    if (this.room_name == 'W47N2') {
      energy = 1300
    }
    return energy_available >= energy
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    if (this.need_attacker && (this.attacker.length < 1)) {
      this.addGeneralAttacker(energy_available, spawn_func)
      return
    }

    this.addCreepForClaim(energy_available, spawn_func)
  }

  private addCreepForClaim(energyAvailable: number, spawnFunc: SpawnFunction): void {
    let body: BodyPartConstant[] = (energyAvailable >= 850) ? [MOVE, MOVE, MOVE, MOVE, MOVE, CLAIM] : [MOVE, MOVE, MOVE, CLAIM]
    const name = this.generateNewName()
    const memory: TempSquadMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.CLAIMER,
      should_notify_attack: false,
      let_thy_die: true,
      arrived: false,
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

  public run(): void {
    this.runAttacker()
    this.runClaimer()
  }

  public description(): string {
    const addition = this.creeps.size > 0 ? `, ${Array.from(this.creeps.values())[0].pos}` : ''
    return `${super.description()} ${addition}`
  }

  // ---
  private runAttacker(): void {
    this.attacker.forEach((creep) => {
      creep.searchAndDestroyTo(this.target_room_name, false)
    })
  }

  private runClaimer():void {
    if (!this.claimer) {
      return
    }
    const creep = this.claimer

    if (!this.target_room_name) {
      this.say(`ERR`)
      return
    }
    const target_room_name = this.target_room_name

    if (creep.moveToRoom(target_room_name) == ActionResult.IN_PROGRESS) {
      return
    }

    const memory = creep.memory as TempSquadMemory
    if (!memory.arrived) {
      (creep.memory as TempSquadMemory).arrived = true

      const message = `TempSquad.run arrived ${target_room_name} with ${creep.ticksToLive}, ${this.name}`
      console.log(message)
      Game.notify(message)
    }

    if (creep.claim(target_room_name, true) == ActionResult.DONE) {
      // @fixme: not working: region stop instantiate TempSquad after it claims a new room

      if (!Memory.rooms[target_room_name]) {
        Memory.rooms[target_room_name] = {
          harvesting_source_ids: [],
        }
      }
      Memory.rooms[target_room_name].ancestor = this.owner_room_name

      const target_room = Game.rooms[this.target_room_name]
      if (target_room && (target_room.name == creep.room.name)) {
        target_room.find(FIND_HOSTILE_STRUCTURES, {
          filter: (structure) => {
            if (structure.my) {
              return false
            }
            const structures_to_destroy: StructureConstant[] = [
              STRUCTURE_EXTENSION,
              STRUCTURE_TOWER,
            ]

            if (structures_to_destroy.indexOf(structure.structureType) >= 0) {
              return true
            }
            return false
          }
        }).forEach((structure) => {
          structure.destroy()
        })
      }
    }

    if (((Game.time % 41) == 1) && (creep.room.name == target_room_name) && creep.room.controller) {
      if (!creep.room.controller.sign || (Memory.versions.indexOf(creep.room.controller.sign.text) < 0)) {
        creep.signController(creep.room.controller, Game.version)
      }
    }
  }
}
