import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction, SquadStatus } from "./squad"
import { CreepStatus, ActionResult, CreepType, CreepSearchAndDestroyOption } from "classes/creep"
import { runHarvester } from "./harvester"
import { Region } from "../region";

export type HarvesterDestination = StructureContainer | StructureTerminal | StructureStorage | StructureLink

export interface RemoteHarvesterMemory extends CreepMemory {
  source_id: string | undefined
}

export interface RemoteHarvesterSquadMemory extends SquadMemory {
  status: SquadStatus
  room_name: string
  sources: {[index: string]: {container_id?: string}}
  room_contains_construction_sites: string[]
  carrier_max?: number
  destination_id?: string
  need_attacker?: boolean
  defend_room_name?: string
}

interface SourceInfo {
  id: string
  target: Source | Mineral | undefined
  container: StructureContainer | undefined
  harvesters: Creep[]
}

export class RemoteHarvesterSquad extends Squad {
  private scout: Creep | undefined
  private builders: Creep[] = []
  private harvesters: Creep[] = []
  private keeper: Creep | undefined
  private source_info = new Map<string, SourceInfo>()
  private carriers: Creep[] = []
  private attackers: Creep[] = []
  private ranged_attackers: Creep[] = []
  private need_attacker: boolean
  private is_room_attacked: boolean
  private keeper_lairs: StructureKeeperLair[] = []
  private containers: StructureContainer[] = []

  private debug = false
  private next_creep: CreepType | undefined
  private harvester_energy_unit = 850

  constructor(readonly name: string, readonly base_room: Room, readonly room_name: string, readonly source_ids: string[], readonly destination: HarvesterDestination, readonly capacity: number, readonly region: Region) {
    super(name)

    const room = Game.rooms[this.room_name] as Room | undefined
    const squad_memory = Memory.squads[this.name] as RemoteHarvesterSquadMemory

    if (squad_memory.destination_id) {
      const specified_destination = Game.getObjectById(squad_memory.destination_id) as HarvesterDestination | undefined

      if (specified_destination) {
        const ok = specified_destination && (
          (specified_destination.structureType == STRUCTURE_CONTAINER)
          || (specified_destination.structureType == STRUCTURE_TERMINAL)
          || (specified_destination.structureType == STRUCTURE_STORAGE)
          || (specified_destination.structureType == STRUCTURE_LINK)
        )

        if (ok) {
          if ((specified_destination.structureType != STRUCTURE_LINK) || (specified_destination.energy == 0)) {
            this.destination = specified_destination
          }
        }
        else {
          const message = `RemoteHarvesterSquad specified destination id is wrong ${squad_memory.destination_id}, ${specified_destination}, ${this.name}, ${this.room_name}`
          console.log(message)
          Game.notify(message)
        }
      }
    }

    if (squad_memory.need_attacker && room) {
      this.keeper_lairs = room.find(FIND_STRUCTURES, {
        filter: (structure: Structure) => {
          return (structure.structureType == STRUCTURE_KEEPER_LAIR)
        }
      }) as StructureKeeperLair[]
    }

    this.source_ids.forEach((id) => {
      let container: StructureContainer | undefined
      const target = Game.getObjectById(id) as Source | Mineral | undefined

      if (squad_memory.sources[id] && squad_memory.sources[id].container_id) {
        container = Game.getObjectById(squad_memory.sources[id].container_id) as StructureContainer | undefined
      }

      if (container) {
        this.containers.push(container)
      }

      if (!container || (container.structureType != STRUCTURE_CONTAINER)) {
        if (target && ((Game.time % 2) == 1)) {
          container = target.pos.findInRange(FIND_STRUCTURES, 2, {
            filter: function(structure: Structure) {
              return structure.structureType == STRUCTURE_CONTAINER
            }
          })[0] as StructureContainer | undefined

          if (container && (container.structureType == STRUCTURE_CONTAINER)) {
            (Memory.squads[this.name] as RemoteHarvesterSquadMemory).sources[id].container_id = container.id
          }
        }
        else {
          container = undefined
        }
      }

      const info: SourceInfo = {
        id,
        target,
        container,
        harvesters: [],
      }
      this.source_info.set(id, info)
    })

    let attacker_max_ticks = 0

    this.creeps.forEach((creep, _) => {
      const memory = creep.memory as RemoteHarvesterMemory

      switch (creep.memory.type) {
        case CreepType.WORKER:
          this.builders.push(creep)
          break

        case CreepType.HARVESTER: {
          this.harvesters.push(creep)

          const source_id: string = memory.source_id || this.source_ids[0]  // Should have memory.source_id
          const info = this.source_info.get(source_id)
          if (!info) {
            creep.say(`NO SRC`)
            console.log(`RemoteHarvesterSquad specified source_id not exists ${this.name}, ${creep.name}, ${memory.source_id}, ${this.source_ids}`)
            return
          }
          info.harvesters.push(creep)
          break
        }

        case CreepType.CARRIER:
          this.carriers.push(creep)
          break

        case CreepType.CONTROLLER_KEEPER:
          this.keeper = creep
          break

        case CreepType.SCOUT:
          this.scout = creep
          break

        case CreepType.ATTACKER: {
          this.attackers.push(creep)
          const ticks = creep.spawning ? 1500 : (creep.ticksToLive || 0)

          if (ticks > attacker_max_ticks) {
            attacker_max_ticks = ticks
          }
          break
        }

        case CreepType.RANGED_ATTACKER: {
          this.ranged_attackers.push(creep)
          break
        }

        default:
          console.log(`RemoteHarvesterSquad unexpected creep type ${creep.memory.type}, ${this.name}`)
          break
      }
    })

    this.need_attacker = !(!squad_memory.need_attacker) && (attacker_max_ticks < 200)

    switch (squad_memory.status) {
      case SquadStatus.NONE:
        break

      case SquadStatus.BUILD:
        break

      case SquadStatus.HARVEST:
        break

      case SquadStatus.ESCAPE:
        break

      default:
        (Memory.squads[this.name] as RemoteHarvesterSquadMemory).status = SquadStatus.NONE
        break
    }

    if (this.harvester_energy_unit <= capacity) {
      this.setNextCreep()
    }

    const room_memory = Memory.rooms[this.room_name]
    this.is_room_attacked = !(!squad_memory.need_attacker) ? false : !(!room_memory.attacked_time)

    if (room) {
      this.showDescription(room, 0)
    }
  }

  private setNextCreep(): void {
    if (this.creeps.size == 0) {
      this.next_creep = CreepType.SCOUT
      return
    }

    const room = Game.rooms[this.room_name] as Room | undefined
    const room_memory = Memory.rooms[this.room_name]

    if ((this.creeps.size == 1) && this.scout && (this.scout.room.name != this.room_name)) {
      // Don't spawn creep before the scout arrives the room
      return
    }

    if (this.is_room_attacked) {
      if ((Game.time % 13) == 5) {
        console.log(`RemoteHarvesterSquad.setNextCreep room ${this.room_name} is under attack ${this.name}`)
      }
      return
    }

    if (!room) {
      if (!this.scout) {
        this.next_creep = CreepType.SCOUT
        return
      }

      if (this.debug) {
        console.log(`RemoteHarvesterSquad.setNextCreep no room`)
      }
      return
    }

    if (this.need_attacker) {
      if (this.attackers.length <= 2) {
        this.next_creep = CreepType.ATTACKER
        return
      }
      else {
        console.log(`RemoteHarvesterSquad.setNextCreep unexpected error ${this.need_attacker} ${this.name} ${this.room_name}`)
      }
    }

    const squad_memory = Memory.squads[this.name] as RemoteHarvesterSquadMemory

    if (squad_memory.need_attacker && (this.ranged_attackers.length == 0)) {
      this.next_creep = CreepType.RANGED_ATTACKER
      return
    }

    if (!this.keeper && !this.is_room_attacked && room.controller) {
      if (!room.controller.reservation || (room.controller.reservation.ticksToEnd < 4000)) {
        this.next_creep = CreepType.CONTROLLER_KEEPER
        return
      }
      else {
        if (this.debug) {
          console.log(`RemoteHarvesterSquad.setNextCreep enough reserved`)
        }
      }
    }

    if ((squad_memory.room_contains_construction_sites.length > 0)) {

      const builder_max = 3
      if (this.builders.length < builder_max) {
        this.next_creep = CreepType.WORKER
      }
      return
    }

    const harvester_max = 1 // @todo:
    let needs_harvester = false

    this.source_info.forEach((info) => {
      if (info.harvesters.length < harvester_max) {
        needs_harvester = true
      }
    })

    if (needs_harvester) {
      this.next_creep = CreepType.HARVESTER
      return
    }

    const carrier_max = squad_memory.carrier_max || this.source_info.size

    if (this.carriers.length < carrier_max) {
      this.next_creep = CreepType.CARRIER
      return
    }
  }

  public get type(): SquadType {
    return SquadType.REMOET_HARVESTER
  }

  public static generateNewName(): string {
    return UID(SquadType.REMOET_HARVESTER)
  }

  public generateNewName(): string {
    return RemoteHarvesterSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    const memory = Memory.squads[this.name] as RemoteHarvesterSquadMemory
    if (memory.stop_spawming) {
      return SpawnPriority.NONE
    }

    if (!this.next_creep) {
      return SpawnPriority.NONE
    }

    const room_memory = Memory.rooms[this.room_name]

    if (([CreepType.ATTACKER, CreepType.RANGED_ATTACKER].indexOf(this.next_creep) < 0)) {
      return SpawnPriority.NONE
    }

    switch (this.next_creep) {
      case CreepType.SCOUT:
        return SpawnPriority.NORMAL

      case CreepType.CONTROLLER_KEEPER:
        return SpawnPriority.NORMAL

      case CreepType.CARRIER:
        return SpawnPriority.NORMAL

      case CreepType.ATTACKER:
        return SpawnPriority.HIGH

      case CreepType.RANGED_ATTACKER:
        return SpawnPriority.HIGH

      default:
        return SpawnPriority.LOW
    }
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    let max: number | undefined
    let energy_unit: number | undefined

    switch (this.next_creep) {
      case CreepType.SCOUT:
        return energy_available >= 50

      case CreepType.CONTROLLER_KEEPER:
        energy_unit = 650
        max = energy_unit * 2
        break

      case CreepType.WORKER:
        energy_unit = 200
        max = energy_unit * 5
        break

      case CreepType.HARVESTER: {
        energy_unit = this.harvester_energy_unit

        const room = Game.rooms[this.room_name]
        const energy_max = (room && room.is_keeperroom) ? (energy_unit * 2) : energy_unit

        max = energy_max
        break
      }

      case CreepType.CARRIER:
        energy_unit = 150
        max = (energy_unit * 12) + 200
        break

      case CreepType.ATTACKER:
        return energy_available >= 3820

      case CreepType.RANGED_ATTACKER:
        return this.hasEnoughEnergyForRangedAttacker(energy_available, capacity)

      default:
        console.log(`RemoteHarvesterSquad.hasEnoughEnergy unexpected creep type ${this.next_creep}, ${this.name}`)
        return false
    }

    if (!max || !energy_unit) {
      console.log(`RemoteHarvesterSquad.hasEnoughEnergy unexpected error ${this.next_creep}, ${max}, ${energy_unit}, ${energy_available}, ${this.name}`)
      return false
    }

    capacity = Math.min((capacity - 50), max)

    const energy_needed = (Math.floor(capacity / energy_unit) * energy_unit)
    return energy_available >= energy_needed
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    switch (this.next_creep) {
      case CreepType.SCOUT:
        this.addGeneralCreep(spawn_func, [MOVE], CreepType.SCOUT)
        return

      case CreepType.CONTROLLER_KEEPER:
        this.addKeeper(energy_available, spawn_func)
        return

      case CreepType.WORKER:
        this.addBuilder(energy_available, spawn_func)
        return

      case CreepType.HARVESTER:
        this.addHarvester(energy_available, spawn_func)
        return

      case CreepType.CARRIER:
        this.addCarrier(energy_available, spawn_func)
        return

      case CreepType.ATTACKER:
        this.addAttacker(energy_available, spawn_func)
        return

      case CreepType.RANGED_ATTACKER:
        this.addBasicRangedAttacker(energy_available, spawn_func)
        return

      default:
        console.log(`RemoteHarvesterSquad.addCreep unexpected creep type ${this.next_creep}, ${this.name}`)
        return
    }
  }

  public run(): void {
    this.runScout()
    this.runKeeper()
    this.runBuilder()
    this.runHarvester()
    this.runCarrier()
    this.runAttacker()
    this.runRangedAttacker()
  }

  public description(): string {
    const number_of_creeps = `S${this.scout ? 1 : 0}K${this.keeper ? 1 : 0}A${this.attackers.length}RA${this.ranged_attackers.length}B${this.builders.length}H${this.harvesters.length}C${this.carriers.length}`
    return `${super.description()}, ${this.room_name}, ${this.next_creep}, ${number_of_creeps}`
  }

  // ---
  private addKeeper(energy_available: number, spawn_func: SpawnFunction): void {

    const body: BodyPartConstant[] = energy_available >= 1300 ? [MOVE, MOVE, CLAIM, CLAIM] : [MOVE, CLAIM]
    const name = this.generateNewName()
    const memory: RemoteHarvesterMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.CONTROLLER_KEEPER,
      should_notify_attack: false,
      let_thy_die: true,
      source_id: undefined,
      debug: this.debug,
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  private addHarvester(energy_available: number, spawn_func: SpawnFunction): void {
    const room = Game.rooms[this.room_name]
    const harvester_max = 1
    let source_id: string | undefined

    this.source_info.forEach((info) => {
      if (info.harvesters.length < harvester_max) {
        source_id = info.id
      }
    })

    if (!source_id) {
      console.log(`RemoteRoomHarvesterSquad.addHarvester no source ${this.source_ids}, ${Array.from(this.source_info.values()).map(info=>info.harvesters.length)}, ${this.name}`)
      return
    }

    const body_unit: BodyPartConstant[] = [
      MOVE, MOVE, MOVE,
      CARRY, CARRY,
      WORK, WORK, WORK,
      WORK, WORK, WORK,
    ]
    const energy_unit = this.harvester_energy_unit

    const name = this.generateNewName()
    let body: BodyPartConstant[] = []
    const memory: RemoteHarvesterMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.HARVESTER,
      should_notify_attack: false,
      let_thy_die: true,
      source_id,
      debug: this.debug,
    }

    const energy_max = (room && room.is_keeperroom) ? (energy_unit * 2) : energy_unit

    energy_available = Math.min(energy_available, energy_max)
    while (energy_available >= energy_unit) {
      body = body.concat(body_unit)
      energy_available -= energy_unit
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  private addBuilder(energy_available: number, spawn_func: SpawnFunction): void {
    const body_unit: BodyPartConstant[] = [
      WORK, CARRY, MOVE,
    ]
    const energy_unit = 200

    const name = this.generateNewName()
    let body: BodyPartConstant[] = []
    const memory: RemoteHarvesterMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.WORKER,
      should_notify_attack: false,
      let_thy_die: true,
      source_id: undefined,
      debug: this.debug,
    }

    energy_available = Math.min(energy_available, energy_unit * 5)
    while (energy_available >= energy_unit) {
      body = body.concat(body_unit)
      energy_available -= energy_unit
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  private addCarrier(energy_available: number, spawn_func: SpawnFunction): void {
    const source_id = this.source_ids[0]

    if (!source_id) {
      console.log(`RemoteRoomHarvesterSquad.addCarrier no source ${this.source_ids}, ${this.name}`)
      return
    }

    const body_unit: BodyPartConstant[] = [
      CARRY, CARRY, MOVE
    ]
    const energy_unit = 150

    const name = this.generateNewName()
    let body: BodyPartConstant[] = []
    const memory: RemoteHarvesterMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.CARRIER,
      should_notify_attack: false,
      let_thy_die: true,
      source_id,
      debug: this.debug,
    }

    energy_available = Math.min(energy_available, (energy_unit * 12) + 200)
    energy_available -= 200

    while (energy_available >= energy_unit) {
      body = body.concat(body_unit)
      energy_available -= energy_unit
    }
    body = body.concat([WORK, CARRY, MOVE])

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  private addAttacker(energy_available: number, spawn_func: SpawnFunction): void {
    const body: BodyPartConstant[] = [
      TOUGH, TOUGH, TOUGH, TOUGH,
      MOVE, MOVE, MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE,
      ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
      ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
      ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
      ATTACK,
      MOVE,
      HEAL, HEAL, HEAL, HEAL, HEAL,
    ]
    this.addGeneralCreep(spawn_func, body, CreepType.ATTACKER)
  }

  // --
  private runScout() {
    if (!this.scout) {
      return
    }
    if (this.scout.spawning) {
      return
    }

    const squad_memory = Memory.squads[this.name] as RemoteHarvesterSquadMemory

    if (((Game.time % 19) == 3) && (squad_memory.room_contains_construction_sites.indexOf(this.scout.room.name) < 0)) {
      const has_construction_site = this.scout.room.find(FIND_MY_CONSTRUCTION_SITES, {
        filter: construction_site_filter
      }).length > 0

      if (has_construction_site) {
        (Memory.squads[this.name] as RemoteHarvesterSquadMemory).room_contains_construction_sites.push(this.scout.room.name)
      }
    }

    if (this.scout.moveToRoom(this.room_name) == ActionResult.IN_PROGRESS) {
      return
    }
    const room = this.scout.room

    // if (room.controller && (this.scout.moveTo(room.controller) == OK)) {
    //   const emoji = ['😆', '😄', '😐', '😴', '🤔', '🙃', '😃']
    //   const index = (Number(room.name.slice(1,3)) + Number(room.name.slice(4,6))) % emoji.length
    //   const sign = emoji[index]
    //   this.scout.signController(room.controller, sign)

    //   return
    // }

    this.scout.moveTo(25, 25)
  }

  private runKeeper(): void {
    if (!this.keeper) {
      return
    }
    if (this.keeper.spawning) {
      return
    }

    const creep = this.keeper

    const squad_memory = Memory.squads[this.name] as RemoteHarvesterSquadMemory

    if (((Game.time % 19) == 5) && (!creep.room.controller || !creep.room.controller.my) && (squad_memory.room_contains_construction_sites.indexOf(creep.room.name) < 0)) {
      const has_construction_site = creep.room.find(FIND_MY_CONSTRUCTION_SITES, {
        filter: construction_site_filter
      }).length > 0

      if (has_construction_site) {
        (Memory.squads[this.name] as RemoteHarvesterSquadMemory).room_contains_construction_sites.push(creep.room.name)
      }
    }

    if (creep.moveToRoom(this.room_name) == ActionResult.IN_PROGRESS) {
      return
    }

    creep.claim(this.room_name, false)
  }

  private runBuilder(): void {
    const squad_memory = Memory.squads[this.name] as RemoteHarvesterSquadMemory

    this.builders.forEach((creep) => {
      if (creep.spawning) {
        return
      }

      if (this.escapeFromHostileIfNeeded(creep, this.room_name, this.keeper_lairs) == ActionResult.IN_PROGRESS) {
        return
      }

      if (creep.carry.energy < creep.carryCapacity) {
        const dropped_energy = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {
          filter: (r: Resource) => {
            return (r.resourceType == RESOURCE_ENERGY) && (r.amount > 0)
          }
        })[0]

        if (dropped_energy) {
          creep.pickup(dropped_energy)
        }
        else {
          const tombstone = creep.pos.findInRange(FIND_TOMBSTONES, 1, {
            filter: (t: Tombstone) => {
              return t.store.energy > 0
            }
          })[0]

          if (tombstone) {
            creep.withdraw(tombstone, RESOURCE_ENERGY)
          }
        }
      }

      if ([CreepStatus.HARVEST, CreepStatus.BUILD].indexOf(creep.memory.status) < 0) {
        creep.memory.status = CreepStatus.HARVEST
      }

      if (creep.memory.status == CreepStatus.HARVEST) {
        if (creep.carry.energy > (creep.carryCapacity - (creep.getActiveBodyparts(WORK) * HARVEST_POWER))) {
          creep.memory.status = CreepStatus.BUILD
        }
        else {
          if (creep.moveToRoom(this.room_name) == ActionResult.IN_PROGRESS) {
            return
          }

          const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
              return (structure.structureType == STRUCTURE_CONTAINER) && (structure.store.energy > 300)
            }
          })

          if (container) {
            if (creep.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
              creep.moveTo(container)
            }
            return
          }

          let source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
          if (source) {
            if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
              creep.moveTo(source)
            }
            return
          }

          source = creep.pos.findClosestByPath(FIND_SOURCES)
          if (source) {
            creep.moveTo(source)
            return
          }

          creep.say(`ERR`)
          // console.log(`RemoteHarvesterSquad.runBuilder can not find source in ${creep.room.name}, ${this.name}`)
          return
        }
      }

      if (creep.memory.status == CreepStatus.BUILD) {
        if (creep.carry.energy == 0) {
          creep.memory.status = CreepStatus.HARVEST
          return
        }

        if (squad_memory.room_contains_construction_sites.indexOf(creep.room.name) < 0) {

          const destination_room_name = squad_memory.room_contains_construction_sites[0]
          if (destination_room_name) {
            creep.moveToRoom(destination_room_name)
            return
          }

          creep.say(`DONE`)
          console.log(`RemoteHarvesterSquad.runBuilder done ${this.name}, ${this.room_name}`)
          creep.memory.squad_name = this.region.worker_squad.name
          return
        }

        const construction_site = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES, {
          filter: construction_site_filter
        })

        if (!construction_site) {
          const index = squad_memory.room_contains_construction_sites.indexOf(creep.room.name)

          if (index >= 0) {
            (Memory.squads[this.name] as RemoteHarvesterSquadMemory).room_contains_construction_sites.splice(index, 1)
          }

          creep.memory.status = CreepStatus.HARVEST
          return
        }

        creep.build(construction_site)
        creep.moveTo(construction_site)
      }
    })
  }

  private runHarvester() {

    this.source_info.forEach((info) => {
      info.harvesters.forEach((creep) => {
        if (creep.spawning) {
          return
        }

        if (this.escapeFromHostileIfNeeded(creep, this.room_name, this.keeper_lairs) == ActionResult.IN_PROGRESS) {
          return
        }

        runHarvester(creep, this.room_name, info.target, info.container, info.container, {
          resource_type: RESOURCE_ENERGY,
        })
      })
    })
  }

  private runCarrier(): void {
    this.carriers.forEach((creep) => {
      if (creep.spawning) {
        return
      }

      if (this.escapeFromHostileIfNeeded(creep, this.room_name, this.keeper_lairs) == ActionResult.IN_PROGRESS) {
        return
      }

      if ((creep.room.name == 'W45S5') && (creep.carry.energy > (creep.carryCapacity * 0.9))) {
        creep.memory.status = CreepStatus.CHARGE
      }

      if ([CreepStatus.HARVEST, CreepStatus.CHARGE].indexOf(creep.memory.status) < 0) {
        creep.memory.status = CreepStatus.HARVEST
      }

      if ((_.sum(creep.carry) < creep.carryCapacity) && creep.room.resourceful_tombstones && (creep.room.resourceful_tombstones.length > 0)) {
        const tombstone = creep.pos.findInRange(creep.room.resourceful_tombstones, 10)[0]
        if (tombstone) {
          if (creep.withdrawResources(tombstone) == ERR_NOT_IN_RANGE) {
            creep.moveTo(tombstone, {maxRooms: 0})
            creep.say(`${tombstone.pos.x},${tombstone.pos.y}`)
          }
          return
        }
      }

      if ((_.sum(creep.carry) < (creep.carryCapacity - 100))) {
        const drop = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 4, {
          filter: (d: Resource) => {
            return d.resourceType == RESOURCE_ENERGY
          }
        })[0]
        if (drop) {
          if (creep.pickup(drop) == ERR_NOT_IN_RANGE) {
            creep.moveTo(drop)
          }
          return
        }
      }

      const should_escape = (creep.room.attacked && !creep.room.is_keeperroom) || (this.is_room_attacked)
      if (should_escape) {
        creep.memory.status = CreepStatus.CHARGE

        if ((_.sum(creep.carry) == 0) && (creep.room.name == this.base_room.name)) {
          creep.moveTo(25, 25)
          return
        }
      }

      if (creep.memory.status == CreepStatus.HARVEST) {
        if (creep.carry.energy > (creep.carryCapacity * 0.95)) {
          creep.memory.status = CreepStatus.CHARGE
        }
        else {
          if (creep.carry.energy > 0) {
            const damaged_structure = creep.pos.findInRange(FIND_STRUCTURES, 3, {
              filter: (structure: AnyStructure) => {
                if (structure.structureType == STRUCTURE_ROAD) {
                  return structure.hits < (structure.hitsMax * 0.9)
                }
                if (structure.structureType == STRUCTURE_CONTAINER) {
                  return structure.hits < (structure.hitsMax * 0.9)
                }
                return false
              }
            })[0]

            if (damaged_structure) {
              creep.repair(damaged_structure)
            }
          }

          if (creep.moveToRoom(this.room_name) == ActionResult.IN_PROGRESS) {
            return
          }

          let energy_threshold = 200
          if (this.room_name == 'W45S5') {
            energy_threshold = 1000
          }

          if (this.containers.length > 0) {
            const containers_with_energy = this.containers.filter((c) => {
              return (c.store.energy > energy_threshold)
            })

            if (containers_with_energy.length > 0) {
              const container = creep.pos.findClosestByPath(containers_with_energy)

              if (container) {
                if (creep.pos.getRangeTo(container) <= 1) {
                  creep.withdraw(container, RESOURCE_ENERGY)
                }
                else {
                  creep.moveTo(container, {maxRooms: 0})
                }
                return
              }
            }

            const closest_container = creep.pos.findClosestByPath(this.containers)

            if (closest_container) {
              if (creep.pos.getRangeTo(closest_container) <= 1) {
                creep.withdraw(closest_container, RESOURCE_ENERGY)
              }
              else {
                creep.moveTo(closest_container, {maxRooms: 0})
              }
              return
            }
          }

          const destination = creep.pos.findClosestByPath(creep.room.sources)

          if (destination) {
            if (creep.pos.getRangeTo(destination) > 3) {
              creep.moveTo(destination, {maxRooms: 0})
            }
          }
        }
      }

      const has_minerals = ((_.sum(creep.carry) - creep.carry.energy) > 0)

      if (creep.memory.status == CreepStatus.CHARGE) {
        if (!has_minerals && (creep.carry.energy < (creep.carryCapacity * 0.2)) && !should_escape) {
          creep.memory.status = CreepStatus.HARVEST
          return
        }

        if (creep.carry.energy > 0) {
          const damaged_structure = creep.pos.findInRange(FIND_STRUCTURES, 3, {
            filter: (structure: AnyStructure) => {
              if (structure.structureType == STRUCTURE_ROAD) {
                return structure.hits < (structure.hitsMax * 0.9)
              }
              if (structure.structureType == STRUCTURE_CONTAINER) {
                return structure.hits < (structure.hitsMax * 0.9)
              }
              return false
            }
          })[0]

          if (damaged_structure) {
            creep.repair(damaged_structure)
          }
        }

        // if (creep.moveToRoom(this.destination.room.name) == ActionResult.IN_PROGRESS) {
        //   return
        // }

        if (!has_minerals || !this.destination.room.storage) {
          const withdraw_result = creep.transfer(this.destination, RESOURCE_ENERGY)
          if (withdraw_result == ERR_NOT_IN_RANGE) {
            creep.moveTo(this.destination)
          }
          else if (withdraw_result != OK) {
            creep.say(`E${withdraw_result}`)
          }
        }
        else {
          const withdraw_result = creep.transferResources(this.destination.room.storage)
          if (withdraw_result == ERR_NOT_IN_RANGE) {
            creep.moveTo(this.destination.room.storage)
          }
          else if (withdraw_result != OK) {
            creep.say(`E${withdraw_result}`)
          }
        }
      }
    })
  }

  private runAttacker(): void {
    const squad_memory = Memory.squads[this.name] as RemoteHarvesterSquadMemory

    if (squad_memory && squad_memory.defend_room_name && (this.ranged_attackers.length > 0)) {
      const defend_room_memory = Memory.rooms[squad_memory.defend_room_name]

      if (defend_room_memory && defend_room_memory.attacked_time) {
        this.defendRoom(squad_memory.defend_room_name)
        return
      }
    }

    this.attackers.forEach((creep) => {
      if (creep.spawning) {
        return
      }

      if ((creep.room.name != this.room_name) && (creep.searchAndDestroyTo(this.room_name, false) == ActionResult.IN_PROGRESS)) {
        return
      }

      const closest_hostile = creep.pos.findClosestByPath(creep.room.attacker_info.hostile_creeps)

      if (closest_hostile) {
        creep.destroy(closest_hostile)
        return
      }

      const keeper_lair = this.keeper_lairs.sort((lhs, rhs) => {
        const l_ticks = (lhs.ticksToSpawn || 0)
        const r_ticks = (rhs.ticksToSpawn || 0)
        if (l_ticks < r_ticks) return -1
        if (l_ticks > r_ticks) return 1
        return 0
      })[0]

      if (keeper_lair) {
        const range = creep.pos.getRangeTo(keeper_lair)

        if ((creep.hits < creep.hitsMax) && (range < 8)) {
        }
        else {
          creep.moveTo(keeper_lair)
        }
      }

      creep.heal(creep)
    })
  }

  private defendRoom(room_name: string): void {
    this.attackers.forEach((creep) => {
      if (creep.spawning) {
        return
      }

      creep.searchAndDestroyTo(room_name, false)
    })
  }

  private runRangedAttacker(): void {
    const attacker = this.attackers[0]//.filter((creep) => {
    //   return creep.room.name == this.room_name
    // })[0]

    this.ranged_attackers.forEach((creep) => {
      if (creep.spawning) {
        return
      }

      // if (creep.moveToRoom(this.room_name) == ActionResult.IN_PROGRESS) {
      //   return
      // }

      let no_move: boolean

      if (attacker) {
        no_move = true
      }
      else {
        no_move = false
      }

      const opt: CreepSearchAndDestroyOption = {
        ignore_source_keeper: false,
        no_move: no_move,
      }

      creep.searchAndDestroy(opt)

      if (attacker) {
        // creep.say(`M2A`)
        creep.moveTo(attacker)
      }
      else {
        // creep.say(`NOATT`)
      }
    })
  }
}

const construction_site_filter = (site: ConstructionSite): boolean => {
  if (site.structureType == STRUCTURE_ROAD) {
    return true
  }
  if (site.structureType == STRUCTURE_CONTAINER) {
    return false
  }
  return false
}
