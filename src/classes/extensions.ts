import { SquadMemory } from "./squad/squad";
import { ControllerKeeperSquad } from "./squad/controller_keeper";

export interface AttackerInfo  {
  attack: number
  ranged_attack: number
  heal: number
  work: number
}

declare global {
  interface Memory {
    last_tick: number
    squads: {[index: string]: SquadMemory}
    temp_squads: SquadMemory[]
    debug_last_tick: any
  }

  interface RoomMemory {
    keeper_squad_name?: string
    harvesting_source_ids: string[]
  }

  interface Room {
    sources: Source[]
    keeper?: ControllerKeeperSquad
    spawns: StructureSpawn[]  // Initialized in Spawn.initialize()
    attacked: boolean // @todo: change it to Creep[]
    heavyly_attacked: boolean
    resourceful_tombstones: Tombstone[]
    attacker_info: AttackerInfo

    initialize(): void
  }

  interface RoomVisual {
    multipleLinedText(text: string | string[], x: number, y: number, style?: TextStyle): void
  }
}

export function init() {
  Room.prototype.initialize = function() {
    this.sources = this.find(FIND_SOURCES)

    const attacker_info: AttackerInfo = {
      attack: 0,
      ranged_attack: 0,
      heal: 0,
      work: 0,
    }

    this.find(FIND_HOSTILE_CREEPS).forEach((creep: Creep) => {
      attacker_info.attack = creep.getActiveBodyparts(ATTACK)
      attacker_info.ranged_attack = creep.getActiveBodyparts(RANGED_ATTACK)
      attacker_info.heal = creep.getActiveBodyparts(HEAL)
      attacker_info.work = creep.getActiveBodyparts(WORK)
    })
    this.attacker_info = attacker_info

    const hostiles = this.find(FIND_HOSTILE_CREEPS, {
      filter: function(creep: Creep): boolean {
        if (creep.pos.x == 0) {
          return false
        }
        if (creep.pos.x == 49) {
          return false
        }
        if (creep.pos.y == 0) {
          return false
        }
        if (creep.pos.y == 49) {
          return false
        }

        const attack_parts = creep.getActiveBodyparts(ATTACK) + creep.getActiveBodyparts(RANGED_ATTACK)
        return attack_parts > 0
      }
    })

    this.attacked = hostiles.length > 0

    let number_of_attacks = 0

    hostiles.forEach((creep: Creep) => {
      number_of_attacks += creep.getActiveBodyparts(ATTACK) + creep.getActiveBodyparts(RANGED_ATTACK) + creep.getActiveBodyparts(HEAL)
    })
    this.heavyly_attacked = number_of_attacks > 5

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
