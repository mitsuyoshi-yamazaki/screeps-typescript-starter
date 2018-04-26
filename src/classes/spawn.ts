import { Reply } from 'interfaces'
import { Squad } from 'classes/squad'

declare global {
  interface StructureSpawn {
    squads: Map<string, Squad>

    initialize(): void
    say(message: string): void
    expand(roomnames: string[]): void

    // internal methods
    // spawn(squad_id: string)
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

    // spawn
    let availableEnergy = this.room.energyAvailable

    if (availableEnergy == this.room.energyCapacityAvailable) {
      if (this.squads.size == 0) {
        const squad_id = Squad.generateNewID()
        const squad = new Squad(squad_id)

        this.squads.set(squad.id, squad);
        (this.memory as any)['squad_ids'] = [squad_id]
      }

      const squad: Squad = this.squads.values().next().value
      console.log(`Spawn and assign to ${squad}`)

      let body = [] as BodyPartConstant[]
      const bodyUnit = [CARRY, WORK, MOVE]
      const unitCost = 200

      while (availableEnergy >= unitCost) {
        body = body.concat(bodyUnit)
        availableEnergy -= unitCost
      }

      const name = `Creep${Game.time}`

      const result = this.spawnCreep(body, name, {
        memory: {
          'squad_id': squad.id
        }
      })

      console.log(`Spawn: ${result}`)
    }

    // run squads
    const sources = this.room.find(FIND_SOURCES)
    console.log(`${sources} found in room ${this.room.name}`)

    this.squads.forEach((squad, _) => {
      squad.harvest(sources[0])
    })
  }
}
