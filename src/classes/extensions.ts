declare global {
  interface Room {
    sources: Source[]

    initialize(): void
  }
}

export function init() {
  Room.prototype.initialize = function() {
    this.sources = this.find(FIND_SOURCES)
  }
}
