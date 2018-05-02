import { ControllerKeeperSquad, SquadMemory } from "./squad";

declare global {
  interface Memory {
    last_tick: number
    squads: SquadMemory[]
    debug_last_tick: any
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
