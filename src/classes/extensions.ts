import { ControllerKeeperSquad } from "./squad";

declare global {
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
