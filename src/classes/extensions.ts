import { SquadMemory } from "./squad/squad";
import { RegionMemory } from "./region"
import { ControllerKeeperSquad } from "./squad/controller_keeper";

export interface AttackerInfo  {
  hostile_creeps: Creep[]
  hostile_teams: string[]
  attack: number
  ranged_attack: number
  heal: number
  work: number
}

declare global {
  interface Game {
    version: string
    reactions: {[index: string]: {lhs: ResourceConstant, rhs: ResourceConstant}}
    check_resources: (resource_type: ResourceConstant) => void
    collect_resources: (resource_type: ResourceConstant, room_name: string, threshold?: number) => void
  }

  interface Memory {
    last_tick: number
    squads: {[index: string]: SquadMemory}
    temp_squads: SquadMemory[]
    debug_last_tick: any
    versions: string[]
    regions: {[index: string]: RegionMemory}
    cpu_usages: number[]
    trading: {stop: boolean}
    debug: {
      show_visuals: boolean,
      test_send_resources: boolean,
    }
  }

  interface RoomMemory {
    keeper_squad_name?: string
    harvesting_source_ids: string[]
    cost_matrix?: number[] | undefined
    attacked_time?: number
    description_position?: {x:number, y:number}
  }

  interface Room {
    sources: Source[]
    keeper?: ControllerKeeperSquad
    spawns: StructureSpawn[]  // Initialized in Spawn.initialize()
    attacked: boolean // @todo: change it to Creep[]
    heavyly_attacked: boolean
    resourceful_tombstones: Tombstone[]
    attacker_info: AttackerInfo
    is_keeperroom: boolean
    cost_matrix: CostMatrix | undefined
    construction_sites?: ConstructionSite[]  // Only checked if controller.my is true
    owned_structures?: Map<StructureConstant, AnyOwnedStructure[]>
    owned_structures_not_found_error(structure_type: StructureConstant): void

    initialize(): void
  }

  interface RoomVisual {
    multipleLinedText(text: string | string[], x: number, y: number, style?: TextStyle): void
  }
}

export function init() {
  Game.check_resources = (resource_type: ResourceConstant) => {
    let details = ""
    let sum = 0

    for (const room_name of Object.keys(Game.rooms)) {
      const room = Game.rooms[room_name]
      if (!room || !room.controller || !room.controller.my) {
        continue
      }

      let amount = 0

      if (room.terminal && room.terminal.my) {
        amount += room.terminal.store[resource_type] || 0
      }

      if (room.storage && room.storage.my) {
        amount += room.storage.store[resource_type] || 0
      }

      details += `\n${room_name}: ${amount}`
      sum += amount
    }
    console.log(`Resource ${resource_type}: ${sum}${details}`)
  }

  Game.collect_resources = (resource_type: ResourceConstant, room_name: string, threshold?: number) => {
    threshold = threshold || 5000

    const target_room = Game.rooms[room_name]
    if (!target_room || !target_room.terminal || !target_room.terminal.my || (_.sum(target_room.terminal.store) > (target_room.terminal.storeCapacity * 0.8))) {
      console.log(`Game.collect_resources failed: ${room_name} not found`)
      return
    }

    let details = ""
    let sum = 0

    for (const name of Object.keys(Game.rooms)) {
      if (name == room_name) {
        continue
      }

      const room = Game.rooms[name]
      if (!room || !room.terminal || !room.terminal.my) {
        continue
      }

      const amount = room.terminal.store[resource_type] || 0
      if ((amount < 100) || (threshold && (amount > threshold))) {
        details += `\n${name}: ${amount}`
        continue
      }

      details += `\n${name}: ${amount}`

      const result = room.terminal.send(resource_type, amount, room_name)
      if (result == OK) {
        details += ` - ${amount}`
        sum += amount
      }
      else {
        console.log(`Game.collect_resources send failed with ${result}: from ${name} to ${room_name}, (${resource_type}, ${amount}, ${room_name})`)
        details += `  E${result}`
      }
    }

    console.log(`Collect resource ${resource_type} ${room_name}: ${target_room.terminal.store[resource_type] || 0} + ${sum}${details}`)
  }

  Room.prototype.initialize = function() {
    let room_memory: RoomMemory | undefined = Memory.rooms[this.name] as RoomMemory | undefined

    if (!room_memory) {
      room_memory = {
        harvesting_source_ids: []
      }
      Memory.rooms[this.name] = room_memory
    }

    this.sources = this.find(FIND_SOURCES)

    const attacker_info: AttackerInfo = {
      hostile_creeps: [],
      hostile_teams: [],
      attack: 0,
      ranged_attack: 0,
      heal: 0,
      work: 0,
    }

    attacker_info.hostile_creeps = this.find(FIND_HOSTILE_CREEPS)

    attacker_info.hostile_creeps.forEach((creep: Creep) => {
      if (attacker_info.hostile_teams.indexOf(creep.owner.username) < 0) {
        attacker_info.hostile_teams.push(creep.owner.username)
      }

      attacker_info.attack = creep.getActiveBodyparts(ATTACK)
      attacker_info.ranged_attack = creep.getActiveBodyparts(RANGED_ATTACK)
      attacker_info.heal = creep.getActiveBodyparts(HEAL)
      attacker_info.work = creep.getActiveBodyparts(WORK)
    })
    this.attacker_info = attacker_info

    if (this.attacker_info.hostile_creeps.length > 0) {
      (Memory.rooms[this.name] as RoomMemory).attacked_time = Game.time
    }
    else {
      (Memory.rooms[this.name] as RoomMemory).attacked_time = undefined
    }

    const hostiles = this.find(FIND_HOSTILE_CREEPS, {
      // filter: function(creep: Creep): boolean {
      //   if (creep.pos.x == 0) {
      //     return false
      //   }
      //   if (creep.pos.x == 49) {
      //     return false
      //   }
      //   if (creep.pos.y == 0) {
      //     return false
      //   }
      //   if (creep.pos.y == 49) {
      //     return false
      //   }

      //   const attack_parts = creep.getActiveBodyparts(ATTACK) + creep.getActiveBodyparts(RANGED_ATTACK)
      //   return attack_parts > 0
      // }
    })

    this.attacked = hostiles.length > 0

    let number_of_attacks = 0

    hostiles.forEach((creep: Creep) => {
      number_of_attacks += (creep.getActiveBodyparts(ATTACK) * 3) + creep.getActiveBodyparts(RANGED_ATTACK) + creep.getActiveBodyparts(HEAL)
    })
    this.heavyly_attacked = number_of_attacks > 16

    this.resourceful_tombstones = this.find(FIND_TOMBSTONES, {
      filter: (tombstone: Tombstone) => {
        const sum = _.sum(tombstone.store)
        const mineral_amount = sum - tombstone.store.energy
        return mineral_amount > 0
      }
    })

    if (!this.resourceful_tombstones) {
      this.resourceful_tombstones = []
    }

    if (this.controller && this.controller.my) {
      this.construction_sites = this.find(FIND_CONSTRUCTION_SITES, {
        filter: (site: ConstructionSite) => site.my
      })
    }

    if (this.controller && this.controller.my) {
      this.owned_structures = new Map<StructureConstant, AnyOwnedStructure[]>()

      this.find(FIND_MY_STRUCTURES).forEach((structure: AnyOwnedStructure) => {
        let structure_list: AnyOwnedStructure[] | null = this.owned_structures.get(structure.structureType)
        if (!structure_list) {
          structure_list = []
        }

        structure_list.push(structure)
        this.owned_structures.set(structure.structureType, structure_list)
      })
    }

    const prefix = (Number(this.name.slice(1,3)) - 4) % 10
    const suffix = (Number(this.name.slice(4,6)) - 4) % 10
    this.is_keeperroom = (prefix <= 2) && (suffix <= 2) && !((prefix == 1) && (suffix == 1))

    if (this.is_keeperroom) {
      if (room_memory.cost_matrix) {
        this.cost_matrix = PathFinder.CostMatrix.deserialize(room_memory.cost_matrix)
      }
      else {
        console.log(`HOGE create costmatrix ${this.name}`)

        this.cost_matrix = new PathFinder.CostMatrix;
        const margin = 5
        const cost = 3
        const road_cost = 1

        this.find(FIND_STRUCTURES).filter((structure: Structure) => {
          return structure.structureType == STRUCTURE_KEEPER_LAIR
        }).forEach((structure: Structure) => {
          for (let i = (structure.pos.x - margin); i <= (structure.pos.x + margin); i++) {
            if ((i < 0) || (i > 49)) {
              continue
            }

            for (let j = (structure.pos.y - margin); j <= (structure.pos.y + margin); j++) {
              if ((j < 0) || (j > 49)) {
                continue
              }

              this.cost_matrix.set(i, j, cost)
            }
          }
        })

        this.find(FIND_SOURCES).forEach((source: Source) => {
          for (let i = (source.pos.x - margin); i <= (source.pos.x + margin); i++) {
            if ((i < 0) || (i > 49)) {
              continue
            }

            for (let j = (source.pos.y - margin); j <= (source.pos.y + margin); j++) {
              if ((j < 0) || (j > 49)) {
                continue
              }

              this.cost_matrix.set(i, j, cost)
            }
          }
        })

        this.find(FIND_MINERALS).forEach((minearl: Mineral) => {
          for (let i = (minearl.pos.x - margin); i <= (minearl.pos.x + margin); i++) {
            if ((i < 0) || (i > 49)) {
              continue
            }

            for (let j = (minearl.pos.y - margin); j <= (minearl.pos.y + margin); j++) {
              if ((j < 0) || (j > 49)) {
                continue
              }

              this.cost_matrix.set(i, j, cost)
            }
          }
        })

        this.find(FIND_STRUCTURES).filter((structure: Structure) => {
          return structure.structureType == STRUCTURE_ROAD
        }).forEach((structure: Structure) => {
          this.cost_matrix.set(structure.pos.x, structure.pos.y, road_cost)
        })

        room_memory.cost_matrix = this.cost_matrix.serialize()
      }
    }
  }

  Room.prototype.owned_structures_not_found_error = function(structure_type: StructureConstant): void {
    console.log(`Room.owned_structures_not_found_error ${structure_type} ${this}`)
  }

  for (const room_name in Game.rooms) {
    const room = Game.rooms[room_name]
    room.spawns = []
  }

  RoomVisual.prototype.multipleLinedText = function(text: string | string[], x: number, y: number, style?: TextStyle): void {
    if (!Memory.debug.show_visuals) {
      return
    }

    const lines = ((text as string).split) ? (text as string).split('\n') : text as string[]
    lines.forEach((line, index) => {
      this.text(line, x, y + index, style)
    })
  }
}
