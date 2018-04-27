import { Reply } from "interfaces"

declare global {
  interface Creep {
    initialize(): void
  }

  interface CreepMemory {
    squad_id: string
  }
}

export function init() {
  Creep.prototype.initialize = function() {
  }
}
