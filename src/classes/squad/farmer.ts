import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"
import { runTowers } from "../tower";

interface FarmerUpgraderMemory extends CreepMemory {
  pos: {x: number, y: number}
}

export interface FarmerSquadMemory extends SquadMemory {
  room_name: string,
  spawn_id: string | null,
  lab_id: string | null,
  storage_position: {x:number, y:number}
  positions: {x:number, y:number}[]
  charger_position: {x:number, y:number}
  renew_position: {x:number, y:number}
}

export class FarmerSquad extends Squad {
  private upgraders: Creep[] = []
  private carriers: Creep[] = []
  private builders: Creep[] = []
  private chargers: Creep[] = []

  // private positions: {x:number, y:number}[] = [  // W49S6
  //   {x: 28, y: 3},
  //   {x: 28, y: 4},
  //   {x: 29, y: 5},
  //   {x: 30, y: 5},
  // ]
  // private positions: {x:number, y:number}[] = [ // W47S8
  //   {x: 14, y: 17},
  //   {x: 15, y: 17},
  //   {x: 16, y: 18},
  //   {x: 16, y: 19},
  // ]
  // private positions: {x:number, y:number}[] = [ // W46S9
  //   {x: 47, y: 26},
  //   {x: 46, y: 26},
  //   {x: 45, y: 25},
  //   {x: 45, y: 24},
  // ]

  // private charger_position: {x:number, y:number} = {x:30, y:3}  // W49S6
  // private charger_position: {x:number, y:number} = {x:, y:} // W47S8
  // private charger_position: {x:number, y:number} = {x:47, y:24} // W46S9

  private storage_position: {x:number, y:number}
  private positions: {x:number, y:number}[]
  private charger_position: {x:number, y:number}
  private renew_position: {x:number, y:number}

  private next_creep: CreepType | undefined

  // private spawn = Game.getObjectById('5b797615b49d6316d39b47dc') as StructureSpawn | undefined // W49S6
  // private container = Game.getObjectById('dummy') as StructureContainer | undefined  // W49S6 container
  // private lab = Game.getObjectById('5b79755fa9d4ad408a00d953') as StructureLab | undefined // W49S6
  // private spawn = Game.getObjectById('dummy') as StructureSpawn | undefined // W47S8
  // private container = Game.getObjectById('dummy') as StructureContainer | undefined  // W47S8 container
  // private lab = Game.getObjectById('dummy') as StructureLab | undefined // W47S8
  // private spawn = Game.getObjectById('5b7ba61df86f4e0754ceb5a5') as StructureSpawn | undefined // W46S9
  // private container = Game.getObjectById('dummy') as StructureContainer | undefined  // W46S9 container
  // private lab = Game.getObjectById('5b7c955cc866f7408b99398d') as StructureLab | undefined // W46S9

  private spawn: StructureSpawn | undefined
  private lab: StructureLab | undefined
  private towers: StructureTower[] = []

  private boost_resource_type: ResourceConstant = RESOURCE_GHODIUM_ACID

  constructor(readonly name: string, readonly base_room: Room, readonly room_name: string) {
    super(name)

    let error_message: string | null = null

    const squad_memory = Memory.squads[this.name] as FarmerSquadMemory
    if (squad_memory) {
      if (squad_memory.spawn_id) {
        this.spawn = Game.getObjectById(squad_memory.spawn_id) as StructureSpawn | undefined
      }
      if (squad_memory.lab_id) {
        this.lab = Game.getObjectById(squad_memory.lab_id) as StructureLab | undefined
      }

      if (squad_memory.storage_position) {
        this.storage_position = squad_memory.storage_position
      }
      else {
        this.storage_position = {x:25, y:25}
        error_message = `[ERROR] FarmerSquad ${this.name} has no storage_position`
      }

      if (squad_memory.positions) {
        this.positions = squad_memory.positions
      }
      else {
        this.positions = []
        error_message = `[ERROR] FarmerSquad ${this.name} has no position`
      }

      if (squad_memory.charger_position) {
        this.charger_position = squad_memory.charger_position
      }
      else {
        this.charger_position = {x:25, y:25}
        error_message = `[ERROR] FarmerSquad ${this.name} has no charger_position`
      }

      if (squad_memory.renew_position) {
        this.renew_position = squad_memory.renew_position
      }
      else {
        this.renew_position = {x:25, y:25}
        error_message = `[ERROR] FarmerSquad ${this.name} has no renew_position`
      }
    }
    else {
      error_message = `[ERROR] FarmerSquad ${this.name} has no memory`
      this.storage_position = {x:25, y:25}
      this.positions = []
      this.charger_position = {x:25, y:25}
      this.renew_position = {x:25, y:25}
    }

    if (error_message && ((Game.time % 43) == 5)) {
      console.log(error_message)
      Game.notify(error_message)
    }

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

        case CreepType.CHARGER:
          this.chargers.push(creep)
          break

        default:
          console.log(`FarmerSquad unexpected creep type ${creep.memory.type}, ${this.name}, ${creep.pos}`)
          break
      }
    })

    this.next_creep = this.nextCreep()

    const room = Game.rooms[this.room_name]

    if (room) {
      const index = 3
      this.showDescription(room, index)
    }
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

    const rcl = (destination_room && destination_room.controller) ? destination_room.controller.level : 0

    // Charger
    if (rcl >= 3) {
      if (this.chargers.length == 0) {
        return CreepType.CHARGER
      }
    }

    // Upgrader
    const upgrader_max = (rcl < 6) ? 4 : this.positions.length

    if (this.upgraders.length < upgrader_max) {
      if ((rcl >= 4) && (rcl < 6) && (this.carriers.length == 0)) { // @todo: if rcl < 4 && storage is empty
        if (debug) {
          console.log(`FarmerSquad.nextCreep no carriers ${this.name}`)
        }
        return CreepType.CARRIER
      }

      // if (destination_room && ((destination_room.storage && (destination_room.storage.store.energy > 5000)) || (this.container && (this.container.store.energy > 1500)))) {
        if (debug) {
          console.log(`FarmerSquad.nextCreep upgrader ${this.name}`)
        }
        return CreepType.UPGRADER
      // }
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

    const carrier_max = (rcl >= 4) ? 14 : 0//12  // @todo: if rcl < 4 && storage is empty
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

      case CreepType.CHARGER:
        return SpawnPriority.HIGH

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

      case CreepType.CHARGER:
        return energy_available >= 850

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

        this.addUpgrader(energy_available, spawn_func, CreepType.UPGRADER, {max_energy: 4500, memory})
        return
      }

      case CreepType.WORKER:
        return // @todo:

      case CreepType.CARRIER:
        this.addCarrier(energy_available, spawn_func)
        return

      case CreepType.CHARGER:
        const body: BodyPartConstant[] = [
          CARRY, CARRY, CARRY, CARRY, CARRY,
          CARRY, CARRY, CARRY, CARRY, CARRY,
          CARRY, CARRY, CARRY, CARRY, CARRY,
          CARRY,
          MOVE
        ]
        this.addGeneralCreep(spawn_func, body, CreepType.CHARGER, true)
        return

      default:
        return
    }
  }

  public run(): void {
    const room = Game.rooms[this.room_name] as Room | undefined
    this.towers = (!room || !room.owned_structures) ? [] : (room.owned_structures.get(STRUCTURE_TOWER) as StructureTower[]) || []

    this.runUpgrader()
    this.runCarrier()
    this.runCharger()

    if (room) {
      runTowers(this.towers, room)

      if ((Game.time % 401) == 0) {
        room.place_construction_sites()
      }
    }
  }

  public description(): string {
    const number_of_creeps = `U${this.upgraders.length}CRY${this.carriers.length}CHG${this.chargers.length}`
    return `${super.description()}, ${this.next_creep}, ${number_of_creeps}`
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

      const room = Game.rooms[this.room_name]
      if (!room || !room.controller || !room.controller.my) {
        const message = `FarmerSquad.runUpgrader unexpectedly null room ${room}, ${this.room_name}, ${this.name}, ${creep.pos}`
        console.log(message)
        Game.notify(message)
        return
      }

      const needs_renew = !creep.memory.let_thy_die && ((creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || (((creep.ticksToLive || 1500) < 30))) && !(!this.base_room.storage) && (this.base_room.storage.store.energy > 100000)

      if (needs_renew) {
        if ((creep.ticksToLive || 1500) > 1490) {
          if (!creep.boosted() && this.lab && room.storage) {
            console.log(`FarmerSquad.runUpgrader boostCreep ${this.room_name}, ${creep.name}, ${this.name}`)
            if ((this.lab.mineralType == this.boost_resource_type) && (this.lab.mineralAmount >= 30) && (room.storage.store.energy > 200000)) {
              const result = this.lab.boostCreep(creep)
              if (result != OK) {
                console.log(`FarmerSquad.runUpgrader boostCreep failed with ${result}, ${this.base_room.name}, ${creep.name}, ${this.name}`)
              }
            }
            else {
              console.log(`FarmerSquad.runUpgrader boostCreep wrong environment ${creep.boosted()}, ${this.lab}, energy: ${room.storage.store.energy}`)
            }
          }
          creep.say(`RENEWED`)
          creep.memory.status = CreepStatus.NONE
        }
        else if (this.spawn && !this.spawn.spawning) {
          creep.memory.status = CreepStatus.WAITING_FOR_RENEW

          // const x = 30 // W49S6
          // const y = 4
          // const x = 15  // W47S8
          // const y = 19
          // const x = 47  // W46S9
          // const y = 25
          if ((creep.pos.x != this.renew_position.x) || (creep.pos.y != this.renew_position.y)) {
            creep.moveTo(this.renew_position.x, this.renew_position.y)
            creep.upgradeController(room.controller)
            return
          }

          if (room.storage) {
            creep.withdraw(room.storage, RESOURCE_ENERGY)
          }
          if (creep.carry.energy > 0) {
            creep.transfer(this.spawn, RESOURCE_ENERGY)
          }
          this.spawn.renewCreep(creep)

          creep.upgradeController(room.controller)
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

      if (room.storage && (room.storage.store.energy > 0)) {
        creep.withdraw(room.storage, RESOURCE_ENERGY)
      }
      // else if (this.container && (this.container.store.energy > 0)) {
      //   creep.withdraw(this.container, RESOURCE_ENERGY)
      // }
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
          creep.build(construction_site)  // @fixme: when build storage
          return
        }
      }

      creep.upgradeController(room.controller)
      // creep.repair(Game.getObjectById('5b7bd895e11abe3f9e43e116') as StructureRampart)
    })
  }

  private runCarrier(): void {
    if (!this.base_room.storage) {
      this.say(`ERR`)
      return
    }
    const storage = this.base_room.storage

                // const pos = new RoomPosition(29, 4, this.room_name) // W49S6
            // const pos = new RoomPosition(, , this.room_name) // W47S8
    // const pos = new RoomPosition(45, 26, this.room_name) // W46S9
    const pos = new RoomPosition(this.storage_position.x, this.storage_position.y, this.room_name)

    this.carriers.forEach((creep) => {
      if (creep.carry.energy == 0) {
        if (creep.pos.getRangeTo(pos) > 2) {
          const drop = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {
            filter: (resource: Resource) => {
              return resource.resourceType == RESOURCE_ENERGY
            }
          })[0]

          if (drop) {
            creep.pickup(drop)
          }
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
          // if (this.container && (this.container.store.energy < this.container.storeCapacity)) {
          //   if (creep.transfer(this.container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          //     creep.moveTo(this.container)
          //   }
          // }
          // else {
            // creep.say(`2`)
            if ((creep.pos.x != pos.x) || (creep.pos.y != pos.y)) {
              creep.moveTo(pos)
            }
            else {
              creep.drop(RESOURCE_ENERGY)
            }
          // }
        }
      }
    })
  }

  private runCharger(): void {
    const room = Game.rooms[this.room_name]
    if (!room) {
      this.say(`NO ROOM`)
      return
    }

    this.chargers.forEach((creep) => {
      const pos = new RoomPosition(this.charger_position.x, this.charger_position.y, this.room_name)

      if ((creep.room.name != pos.roomName) || (creep.pos.x != pos.x) || (creep.pos.y != pos.y)) {
        creep.moveTo(pos)
        return
      }

      if (((creep.ticksToLive || 1500) < 1400) && this.spawn && !this.spawn.spawning) { // @fixme: 1400
        this.spawn.renewCreep(creep)
      }

      const carry = _.sum(creep.carry)

      if (carry == 0) {
        if (room.terminal && this.lab && (this.lab.mineralAmount < this.lab.mineralCapacity)) {
          if (this.lab.mineralType && (this.lab.mineralType != this.boost_resource_type)) {
            creep.withdraw(this.lab, this.lab.mineralType)
            return
          }

          if ((room.terminal.store[this.boost_resource_type] || 0) > 0) {
            creep.withdraw(room.terminal, this.boost_resource_type)
            return
          }
        }

        if (((Game.time % 229) == 3) && room.terminal && room.storage) {
          if ((_.sum(room.storage.store) - room.storage.store.energy) > 0) {
            creep.withdrawResources(room.storage, {exclude: ['energy']})
            return
          }
        }

        if (room.terminal && (room.terminal.store.energy > 0)) {
          creep.withdraw(room.terminal, RESOURCE_ENERGY)
          return
        }

        if (room.storage && (room.storage.store.energy > 0)) {
          creep.withdraw(room.storage, RESOURCE_ENERGY)
          return
        }

        const drop = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {
          filter: (resource: Resource) => {
            return resource.resourceType == RESOURCE_ENERGY
          }
        })[0]

        if (drop) {
          creep.pickup(drop)
          return
        }

        creep.say(`NO ENGY`)
      }
      else {
        if ((carry - creep.carry.energy) > 0) {
          if (((creep.carry[this.boost_resource_type] || 0) > 0) && this.lab && (this.lab.mineralAmount < this.lab.mineralCapacity) && (!this.lab.mineralType || (this.lab.mineralType == this.boost_resource_type))) {
            creep.transfer(this.lab, this.boost_resource_type)
          }
          else {
            if (room.terminal) {
              creep.transferResources(room.terminal)
              return
            }

            if (room.storage) {
              creep.transferResources(room.storage)
              return
            }

            creep.say(`NO STR`)
          }
        }

        let charge_targets: (StructureSpawn | StructureLab | StructureTower)[] = []

        if (this.spawn) {
          charge_targets.push(this.spawn)
        }
        if (this.lab) {
          charge_targets.push(this.lab)
        }
        if (this.towers && (this.towers.length > 0)) {
          charge_targets = charge_targets.concat(this.towers)
        }

        charge_targets = charge_targets.filter(structure => {
          if (structure.structureType == STRUCTURE_SPAWN) {
            return structure.energy < (structure.energyCapacity * 0.5)
          }
          if (structure.energy < (structure.energyCapacity * 0.8)) {
            return true
          }
          return false
        })

        const target = charge_targets[0]

        if (target) {
          // console.log(`tgt ${target}, ${target.pos}`)
          creep.transfer(target, RESOURCE_ENERGY)
          return
        }
        else {
          if (room.storage && (_.sum(room.storage.store) < (room.storage.storeCapacity * 0.8))) {
            // console.log(`tgt storage`)

            creep.transfer(room.storage, RESOURCE_ENERGY)
            return
          }
          else if (room.terminal) {
            // console.log(`tgt terminal`)

            creep.transfer(room.terminal, RESOURCE_ENERGY)
            return
          }
          // console.log(`tgt none`)

          if (room.controller && (room.controller.level >= 4)) {
            creep.say(`NO CHG`)
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
