import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export interface RemoteMineralHarvesterSquadMemory extends SquadMemory {
  room_name: string
  mineral_id: string
  keeper_lair_id: string
}

export class RemoteMineralHarvesterSquad extends Squad {
  private harvester: Creep | undefined
  private carrier: Creep | undefined
  private mineral: Mineral | undefined
  private keeper_lair: StructureKeeperLair | undefined
  readonly room_name: string

  constructor(readonly name: string, readonly destination: StructureStorage) {
    super(name)

    const squad_memory = Memory.squads[this.name] as RemoteMineralHarvesterSquadMemory

    this.mineral = Game.getObjectById(squad_memory.mineral_id) as Mineral | undefined
    this.keeper_lair = Game.getObjectById(squad_memory.keeper_lair_id) as StructureKeeperLair | undefined
    this.room_name = squad_memory.room_name

    if (!this.room_name) {
      console.log(`RemoteMineralHarvesterSquad.room_name is not provided ${this.room_name}, ${this.name}`)
    }

    this.creeps.forEach((creep) => {
      switch (creep.memory.type) {
        case CreepType.HARVESTER:
          this.harvester = creep
          break

        case CreepType.CARRIER:
          this.carrier = creep
          break

        default:
          console.log(`RemoteMineralHarvesterSquad unexpected creep type ${creep.memory.type}, ${this.name}`)
          break
      }
    })
  }

  public get type(): SquadType {
    return SquadType.REMOET_M_HARVESTER
  }

  public static generateNewName(): string {
    return UID(SquadType.REMOET_M_HARVESTER)
  }

  public generateNewName(): string {
    return RemoteMineralHarvesterSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    const memory = (Memory.squads[this.name] as RemoteMineralHarvesterSquadMemory)
    if (memory.stop_spawming) {
      return SpawnPriority.NONE
    }

    if (!this.destination) {
      const message = `RemoteMineralHarvesterSquad.spawnPriority no destination ${this.destination}, ${this.name}, ${this.room_name}`
      console.log(message)
      Game.notify(message)
      return SpawnPriority.NONE
    }

    if (!this.mineral || (this.mineral.mineralAmount == 0)) {
      return SpawnPriority.NONE
    }

    if (!this.harvester) {
      return SpawnPriority.LOW
    }
    if (!this.carrier) {
      return SpawnPriority.NORMAL
    }

    return SpawnPriority.NONE
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    if (!this.harvester) {
      return energy_available >= 2750
    }
    if (!this.carrier) {
      return energy_available >= 500
    }
    return false
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    if (!this.harvester) {
      this.addHarvester(energy_available, spawn_func)
      return
    }
    if (!this.carrier) {
      this.addCarrier(energy_available, spawn_func)
      return
    }
  }

  public run(): void {
    this.runHarvester()
    this.runCarrier()
  }

  // ---
  private addHarvester(energy_available: number, spawn_func: SpawnFunction): void {
    // 20W, 10M, 5C

    const body: BodyPartConstant[] = [
      MOVE, MOVE, MOVE, MOVE, MOVE,
      WORK, WORK, WORK, WORK, WORK,
      WORK, WORK, WORK, WORK, WORK,
      WORK, WORK, WORK, WORK, WORK,
      WORK, WORK, WORK, WORK, WORK,
      CARRY, CARRY, CARRY, CARRY, CARRY,
      MOVE, MOVE, MOVE, MOVE, MOVE,
    ]

    this.addGeneralCreep(spawn_func, body, CreepType.HARVESTER)
  }

  private addCarrier(energy_available: number, spawn_func: SpawnFunction): void {
    const body: BodyPartConstant[] = [
      MOVE, MOVE,
      CARRY, CARRY, CARRY, CARRY, CARRY,
      MOVE, MOVE, MOVE,
    ]

    this.addGeneralCreep(spawn_func, body, CreepType.CARRIER)
  }

  private runHarvester() {
    if (!this.harvester) {
      return
    }

    const creep = this.harvester
    const keeper_lairs = this.keeper_lair ? [this.keeper_lair] : []

    if (this.escapeFromHostileIfNeeded(creep, this.room_name, keeper_lairs) == ActionResult.IN_PROGRESS) {
      return
    }

    if (this.mineral) {
      if (creep.harvest(this.mineral) == ERR_NOT_IN_RANGE) {
        creep.moveTo(this.mineral)
      }
    }
    else {
      if (creep.moveToRoom(this.room_name) == ActionResult.IN_PROGRESS) {
        return
      }
    }
  }

  private runCarrier() {
    if (!this.carrier) {
      return
    }

    const creep = this.carrier
    const keeper_lairs = this.keeper_lair ? [this.keeper_lair] : []

    if (this.escapeFromHostileIfNeeded(creep, this.room_name, keeper_lairs) == ActionResult.IN_PROGRESS) {
      return
    }

    const carry = _.sum(creep.carry)

    if (carry > (creep.carryCapacity - 30)) {
      if (creep.transferResources(this.destination) == ERR_NOT_IN_RANGE) {
        creep.moveTo(this.destination)
      }
      return
    }

    if (this.harvester) {
      if (this.mineral) {
        if (this.harvester.transfer(creep, this.mineral.mineralType) == ERR_NOT_IN_RANGE) {
          creep.moveTo(this.harvester)
        }
      }
      else {
        creep.moveTo(this.harvester)
      }
      return
    }

    creep.moveToRoom(this.room_name)
  }
}
