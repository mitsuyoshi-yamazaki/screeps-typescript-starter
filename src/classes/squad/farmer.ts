import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

interface FarmerUpgraderMemory extends CreepMemory {
  pos: {x: number, y: number}
}

export interface FarmerSquadMemory extends SquadMemory {
  room_name: string,
}

export class FarmerSquad extends Squad {
  private upgraders: Creep[] = []
  private carriers: Creep[] = []
  private builders: Creep[] = []
  private positions: {x:number, y:number}[] = [
    {x: 29, y: 4},
    {x: 29, y: 5},
    {x: 29, y: 6},
  ]

  private next_creep: CreepType | undefined
  private container = Game.getObjectById('5b7600e566e2a17bd4a952b9') as StructureContainer | undefined  // W49S6 container

  constructor(readonly name: string, readonly base_room: Room, readonly room_name: string) {
    super(name)

    this.creeps.forEach((creep) => {
      switch (creep.memory.type) {
        case CreepType.UPGRADER:
          this.upgraders.push(creep)

          if (!(creep.memory as FarmerUpgraderMemory).pos) {
            (creep.memory as FarmerUpgraderMemory).pos = this.find_non_used_position()
          }
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
    let debug = false

    const destination_room = Game.rooms[this.room_name] as Room | undefined
    if (destination_room) {
      if (destination_room.controller && (destination_room.controller.level == 8)) {
        if (debug) {
          console.log(`FarmerSquad.nextCreep RCL8 ${this.name}`)
        }
        return undefined
      }
    }

    // Upgrader
    const rcl = (destination_room && destination_room.controller) ? destination_room.controller.level : 0
    const upgrader_max = (rcl < 6) ? 1 : this.positions.length

    if (this.upgraders.length < upgrader_max) {
      if ((rcl < 6) && (this.carriers.length == 0)) {
        if (debug) {
          console.log(`FarmerSquad.nextCreep no carriers ${this.name}`)
        }
        return CreepType.CARRIER
      }

      if (destination_room && ((destination_room.storage && (destination_room.storage.store.energy > 5000)) || (this.container && (this.container.store.energy > 1500)))) {
        if (debug) {
          console.log(`FarmerSquad.nextCreep upgrader ${this.name}`)
        }
        return CreepType.UPGRADER
      }
    }

    // Carrier
    if (!this.base_room.storage) {
      if (debug) {
        console.log(`FarmerSquad.nextCreep no base room storage ${this.name}`)
      }
      return undefined
    }
    else if (this.base_room.storage.store.energy < 200000) {
      if (debug) {
        console.log(`FarmerSquad.nextCreep lack of energy ${this.name}`)
      }
      return undefined
    }

    const carrier_max = ((rcl >= 4) && (rcl <= 5)) ? 12 : 8
    if (destination_room && destination_room.controller && (destination_room.controller.level < 6) && (this.carriers.length < carrier_max)) {
      if (debug) {
        console.log(`FarmerSquad.nextCreep carrier ${this.name}`)
      }
      return CreepType.CARRIER
    }

    if (debug) {
      console.log(`FarmerSquad.nextCreep none ${this.name}`)
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
      case CreepType.UPGRADER: {
        const memory: FarmerUpgraderMemory = {
          squad_name: this.name,
          status: CreepStatus.NONE,
          birth_time: Game.time,
          type: CreepType.UPGRADER,
          should_notify_attack: false,
          let_thy_die: false,
          pos: this.find_non_used_position()
        }

        this.addUpgrader(energy_available, spawn_func, CreepType.UPGRADER, {max_energy: 4500, huge: true, memory})
        return
      }

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

    energy_available = Math.min(energy_available, (energy_unit * 16))

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
      if (creep.spawning) {
        return
      }

      const needs_renew = !creep.memory.let_thy_die && ((creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || (((creep.ticksToLive || 1500) < 30))) && !(!this.base_room.storage) && (this.base_room.storage.store.energy > 100000)

      if (needs_renew) {
        if ((creep.ticksToLive || 1500) > 1490) {
          console.log(`FarmerSquad.runUpgrader boostCreep ${this.base_room.name}, ${creep.name}, ${this.name}`)
          const lab = Game.getObjectById('5b5aaa177b80103f4711729a') as StructureLab | undefined  // W49S6
          if (!creep.boosted()) {
            if (lab && (lab.mineralType == RESOURCE_GHODIUM_ACID) && (lab.mineralAmount >= 30)) {
              const result = lab.boostCreep(creep)
              if (result != OK) {
                console.log(`FarmerSquad.runUpgrader boostCreep failed with ${result}, ${this.base_room.name}, ${creep.name}, ${this.name}`)
              }
            }
            else {
              console.log(`FarmerSquad.runUpgrader boostCreep wrong environment ${creep.boosted()}, ${lab}`)
            }
          }
          creep.memory.status = CreepStatus.NONE
        }
        else if ((creep.room.spawns.length > 0) && ((creep.room.energyAvailable > 40) || ((creep.ticksToLive || 0) > 400)) && !creep.room.spawns[0].spawning) {
          const x = 31
          const y = 5
          if ((creep.pos.x != x) || (creep.pos.y != y)) {
            creep.moveTo(x, y)
            return
          }
          creep.goToRenew(creep.room.spawns[0], {ticks: 1490, no_auto_finish: true, withdraw: true})
          return
        }
        else if (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) {
          creep.memory.status = CreepStatus.NONE
        }
      }

      const memory = creep.memory as FarmerUpgraderMemory
      const memorized_pos = memory.pos || {x: 29, y: 4}
      const pos = new RoomPosition(memorized_pos.x, memorized_pos.y, this.room_name)

      if ((creep.room.name != this.room_name) || (creep.pos.x != pos.x) || (creep.pos.y != pos.y)) {
        const result = creep.moveTo(pos)
        if ((result != OK) && (result != ERR_TIRED)) {
          creep.say(`E${result}`)
        }
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

      if (!creep.boosted()) {
        const construction_site = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 3)[0]
        if (construction_site) {
          creep.build(construction_site)
          return
        }
      }

      creep.upgradeController(room.controller)
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
        const drop = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {
          filter: (resource: Resource) => {
            return resource.resourceType == RESOURCE_ENERGY
          }
        })[0]

        if (drop) {
          creep.pickup(drop)
        }

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

        if (destination_room.storage && destination_room.controller && (destination_room.controller.level >= 4)) {
          if (creep.transfer(destination_room.storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(destination_room.storage)
          }
        }
        else {
          if (this.container && (this.container.store.energy < this.container.storeCapacity)) {
            if (creep.transfer(this.container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
              creep.moveTo(this.container)
            }
          }
          else {
            // creep.say(`2`)
            const pos = new RoomPosition(30, 4, this.room_name)
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

  // --
  private find_non_used_position(): {x: number, y: number} {
    for (const pos of this.positions) {
      let used = false

      for (const creep of this.upgraders) {
        const memory = creep.memory as FarmerUpgraderMemory
        if (!memory.pos) {
          continue
        }
        if ((memory.pos.x == pos.x) && (memory.pos.y == pos.y)) {
          used = true
          break
        }
      }

      if (!used) {
        return pos
      }
    }

    console.log(`FarmerSquad.find_empty_position used all positions ${this.name}, ${this.room_name}`)
    return this.positions[0]
  }
}
