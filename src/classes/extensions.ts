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
  }

  interface Memory {
    last_tick: number
    squads: {[index: string]: SquadMemory}
    temp_squads: SquadMemory[]
    debug_last_tick: any
    versions: string[]
    regions: {[index: string]: RegionMemory}
  }

  interface RoomMemory {
    keeper_squad_name?: string
    harvesting_source_ids: string[]
    cost_matrix?: number[] | undefined
    attacked_time?: number
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

    initialize(): void
  }

  interface RoomVisual {
    multipleLinedText(text: string | string[], x: number, y: number, style?: TextStyle): void
  }
}

export function init() {
  Room.prototype.initialize = function() {
    let memory: RoomMemory | undefined = Memory.rooms[this.name] as RoomMemory | undefined

    if (!memory) {
      memory = {
        harvesting_source_ids: []
      }
      Memory.rooms[this.name] = memory
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

    const prefix = (Number(this.name.slice(1,3)) - 4) % 10
    const suffix = (Number(this.name.slice(4,6)) - 4) % 10
    this.is_keeperroom = (prefix <= 2) && (suffix <= 2) && !((prefix == 1) && (suffix == 1))

    if (this.is_keeperroom) {
      if (memory.cost_matrix) {
        this.cost_matrix = PathFinder.CostMatrix.deserialize(memory.cost_matrix)
      }
      else {
        this.cost_matrix = new PathFinder.CostMatrix;
        const margin = 5
        const cost = 5

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

        memory.cost_matrix = this.cost_matrix.serialize()
      }
    }
  }

  for (const room_name in Game.rooms) {
    const room = Game.rooms[room_name]
    room.spawns = []
  }

  RoomVisual.prototype.multipleLinedText = function(text: string | string[], x: number, y: number, style?: TextStyle): void {

    const lines = ((text as string).split) ? (text as string).split('\n') : text as string[]
    lines.forEach((line, index) => {
      this.text(line, x, y + index, style)
    })
  }
}
