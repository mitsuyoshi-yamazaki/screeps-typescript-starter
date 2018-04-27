import { Reply } from "interfaces"

declare global {
  interface Creep {
    initialize(): void
  }
}

export function init() {
  Creep.prototype.initialize = function() {
  }
}
