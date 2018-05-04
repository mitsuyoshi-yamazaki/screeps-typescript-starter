import { SquadMemory } from "./squad/squad";
import { ControllerKeeperSquad } from "./squad/controller_keeper";

declare global {
  interface Memory {
    last_tick: number
    squads: SquadMemory[]
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
    spawn?: StructureSpawn  // Initialized in Spawn.initialize()

    initialize(): void
  }

  interface RoomVisual {
    multipleLinedText(text: string | string[], x: number, y: number, style?: TextStyle): void
  }
}

export function init() {
  Room.prototype.initialize = function() {
    this.sources = this.find(FIND_SOURCES)
  }

  RoomVisual.prototype.multipleLinedText = function(text: string | string[], x: number, y: number, style?: TextStyle): void {

    const lines = ((text as string).split) ? (text as string).split('\n') : text as string[]
    lines.forEach((line, index) => {
      this.text(line, x, y + index, style)
    })
  }
}
