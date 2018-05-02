import { ControllerKeeperSquad, SquadMemory } from "./squad";

declare global {
  interface Memory {
    squads: SquadMemory[]
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
