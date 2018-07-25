import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export interface FarmerSquadMemory extends SquadMemory {
  room_name: string,
}

export class FarmerSquad extends Squad {
  private upgraders: Creep[] = []
  private carriers: Creep[] = []
  private builders: Creep[] = []

  private next_creep: CreepType | undefined
  private container = Game.getObjectById('5b574744914d5a727c4a581e') as StructureContainer | undefined  // W49S6 container

  constructor(readonly name: string, readonly base_room: Room, readonly room_name: string) {
    super(name)

    this.creeps.forEach((creep) => {
      switch (creep.memory.type) {
        case CreepType.UPGRADER:
          this.upgraders.push(creep)
          break

        case CreepType.WORKER:
          this.builders.push(creep)
          break

        case CreepType.CARRIER:
          this.carriers.push(creep)
          break

        default:
          console.log(`FarmerSquad unexpected creep type ${creep.memory.type}, ${this.name}, ${creep.pos}`)
          break
      }
    })

    this.next_creep = this.nextCreep()
  }

  private nextCreep(): CreepType | undefined {
    const room = Game.rooms[this.room_name] as Room | undefined
    if (room) {
      if (room.controller && (room.controller.level == 8)) {
        return undefined
      }
      else if (!this.base_room.storage) {
        return undefined
      }
      else if (this.base_room.storage.store.energy < 200000) {
        return undefined
      }

      const destination_room = Game.rooms[this.room_name] as Room | undefined
      if (destination_room) {
        if (destination_room.storage && (_.sum(destination_room.storage.store) > (destination_room.storage.storeCapacity - 100000))) {
          return undefined
        }
      }
    }

    const upgrader_max = 1
    if (this.upgraders.length < upgrader_max) {
      if (room && !room.terminal && (this.carriers.length == 0)) {
        return CreepType.CARRIER
      }

      return CreepType.UPGRADER
    }

    const carrier_max = 5
    if (room && !room.terminal && (this.carriers.length < carrier_max)) {
      return CreepType.CARRIER
    }

    return undefined
  }

  public get type(): SquadType {
    return SquadType.FARMER
  }

  public static generateNewName(): string {
    return UID(SquadType.FARMER)
  }

  public generateNewName(): string {
    return FarmerSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    const squad_memory = Memory.squads[this.name]
    if (squad_memory.stop_spawming) {
      return SpawnPriority.NONE
    }

    switch (this.next_creep) {
      case CreepType.UPGRADER:
        return SpawnPriority.LOW

      case CreepType.WORKER:
        return SpawnPriority.NONE // @fixme:

      case CreepType.CARRIER:
        return SpawnPriority.NORMAL

      default:
        return SpawnPriority.NONE
    }
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    let max: number | undefined
    let energy_unit: number | undefined

    switch (this.next_creep) {
      case CreepType.UPGRADER:
        return this.hasEnoughEnergyForUpgrader(energy_available, capacity, 4300)

      case CreepType.WORKER:
        energy_unit = 200
        max = energy_unit * 8
        break

      case CreepType.CARRIER:
        energy_unit = 150
        max = (energy_unit * 12)
        break

      default:
        console.log(`FarmerSquad.hasEnoughEnergy unexpected creep type ${this.next_creep}, ${this.name}`)
        return false
    }

    if (!max || !energy_unit) {
      console.log(`FarmerSquad.hasEnoughEnergy unexpected error ${this.next_creep}, ${max}, ${energy_unit}, ${energy_available}, ${this.name}`)
      return false
    }

    capacity = Math.min((capacity - 50), max)

    const energy_needed = (Math.floor(capacity / energy_unit) * energy_unit)
    return energy_available >= energy_needed
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    switch (this.next_creep) {
      case CreepType.UPGRADER:
        this.addUpgrader(energy_available, spawn_func, CreepType.UPGRADER, 4300)
        return

      case CreepType.WORKER:
        return // @todo:

      case CreepType.CARRIER:
        this.addCarrier(energy_available, spawn_func)
        return

      default:
        return
    }
  }

  public run(): void {
    this.runUpgrader()
    this.runCarrier()
  }

  // ---
  private addCarrier(energy_available: number, spawn_func: SpawnFunction): void {
    const body_unit: BodyPartConstant[] = [
      CARRY, CARRY, MOVE
    ]
    const energy_unit = 150

    const name = this.generateNewName()
    let body: BodyPartConstant[] = []
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.CARRIER,
      should_notify_attack: false,
      let_thy_die: true,
    }

    energy_available = Math.min(energy_available, (energy_unit * 12))

    while (energy_available >= energy_unit) {
      body = body.concat(body_unit)
      energy_available -= energy_unit
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  // ---
  private runUpgrader(): void {
    this.upgraders.forEach((creep) => {
      const pos = new RoomPosition(29, 5, this.room_name)

      if ((creep.room.name != this.room_name) || (creep.pos.x != pos.x) || (creep.pos.y != pos.y)) {
        creep.moveTo(pos)
        return
      }

      const room = Game.rooms[this.room_name]
      if (!room || !room.controller || !room.controller.my) {
        const message = `FarmerSquad.runUpgrader unexpectedly null room ${room}, ${this.room_name}, ${this.name}, ${creep.pos}`
        console.log(message)
        Game.notify(message)
        return
      }

      if (room.storage && (room.storage.store.energy > 0)) {
        creep.withdraw(room.storage, RESOURCE_ENERGY)
      }
      else if (this.container && (this.container.store.energy > 0)) {
        creep.withdraw(this.container, RESOURCE_ENERGY)
      }
      else {
        const drop = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {
          filter: (d: Resource) => {
            return d.resourceType == RESOURCE_ENERGY
          }
        })[0]

        if (drop) {
          creep.pickup(drop)
        }
      }

      const construction_site = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 3)[0]

      if (construction_site) {
        creep.build(construction_site)
      }
      else {
        creep.upgradeController(room.controller)
      }
    })
  }

  private runCarrier(): void {
    if (!this.base_room.storage) {
      this.say(`ERR`)
      return
    }
    const storage = this.base_room.storage

    this.carriers.forEach((creep) => {
      if (creep.carry.energy == 0) {
        if (creep.room.is_keeperroom) {
          if (creep.moveToRoom(this.base_room.name) == ActionResult.IN_PROGRESS) {
            return
          }
        }

        if (creep.withdraw(storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(storage)
        }
      }
      else {
        const destination_room = Game.rooms[this.room_name] as Room | undefined
        if (!destination_room) {
          creep.moveToRoom(this.room_name)
          return
        }

        if (destination_room.storage) {
          if (creep.transfer(destination_room.storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(destination_room.storage)
          }
        }
        else {
          if (this.container) {
            if (creep.transfer(this.container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
              creep.moveTo(this.container)
            }
          }
          else {
            const pos = new RoomPosition(31, 6, this.room_name)
            if ((creep.pos.x != pos.x) || (creep.pos.y != pos.y)) {
              creep.moveTo(pos)
            }
            else {
              creep.drop(RESOURCE_ENERGY)
            }
          }
        }
      }
    })
  }
}
