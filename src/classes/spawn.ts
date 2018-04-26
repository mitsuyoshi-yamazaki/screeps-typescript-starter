import { Reply } from 'interfaces'
import { Squad } from 'squad'

declare global {
  interface StructureSpawn {
    squads: Map<string, Squad>

    initialize(): void
    say(message: string): void
    expand(roomnames: string[]): void

  }
}

export function init() {
  StructureSpawn.prototype.initialize = function() {
    this.squads = new Map<string, Squad>()
    const squad_ids = (this.memory as any)['squad_ids'] as string[]

    if ((squad_ids == null) || (squad_ids.length == 0)) {
      (this.memory as any)['squad_ids'] = [] as string[]
      return
    }

    for (const squad_id of squad_ids) {
      const squad = new Squad(squad_id)

      this.squads.set(squad.id, squad)
    }
  }

  StructureSpawn.prototype.say = function(message) {
    this.squads.forEach((squad, _) => {
      squad.say(message)
    })
  }

  StructureSpawn.prototype.expand = function(roomnames: string[]) {

    const sources = this.room.find(FIND_SOURCES)
    console.log(`${sources} found in room ${this.room.name}`)

    this.squads.forEach((squad, _) => {
      squad.harvest(sources[0])
    })
  }
}
