import { SquadMemory } from "./squad/squad";
import { ControllerKeeperSquad } from "./squad/controller_keeper";

declare global {
  interface Memory {
    last_tick: number
    squads: SquadMemory[]
    debug_last_tick: any
  }

  interface RoomMemory {
    keeper_squad_name?: string
    harvesting_source_ids: string[]
  }

  interface Room {
    sources: Source[]
    keeper?: ControllerKeeperSquad

    initialize(): void
  }
}

export function init() {
  Room.prototype.initialize = function() {
    this.sources = this.find(FIND_SOURCES)
  }
}
