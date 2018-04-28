import { Squad, SquadType, SpawnPriority } from "classes/squad"
// import { CreepStatus } from "classes/creep"
import { Reply } from "interfaces"

declare global {
  interface StructureSpawn {
    squads: Map<string, Squad>



    initialize(): void
    say(message: string): void
    expand(roomnames: string[]): void
  }

  interface SpawnMemory {
    squad_ids: string[]
  }
}

export function init() {
  StructureSpawn.prototype.initialize = function() {
    // memory
    if (this.memory.squad_ids == null) {
      this.memory.squad_ids = []
    }

    // squads
    this.squads = new Map<string, Squad>()

    for (const squad_id of this.memory.squad_ids) {
      const squad = new Squad(squad_id, SquadType.CONTROLLER_KEEPER)
      this.squads.set(squad.id, squad)
    }

    // spawn
    if (this.spawning == null) {
      let highest_priority: SpawnPriority = SpawnPriority.LOW
      let spawn_needed_squad: Squad | null = null

      this.squads.forEach((squad, _) => {
        if (squad.spawnPriority < highest_priority) {
          spawn_needed_squad = squad
          highest_priority = squad.spawnPriority
        }
      })

      if (spawn_needed_squad != null) {
        spawn_needed_squad!.addCreep(this.spawnCreep)
      }
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
        const squad = new Squad(squad_id, SquadType.CONTROLLER_KEEPER)

        this.squads.set(squad.id, squad);
        (this.memory as any).squad_ids = [squad_id]
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
          squad_id: squad.id,
          status: CreepStatus.NONE,
        }
      })

      console.log(`Spawn: ${result}`)
    }

    // run squads
    const sources = this.room.find(FIND_SOURCES)
    console.log(`${sources} found in room ${this.room.name}`)

    this.squads.forEach((squad, _) => {
      squad.upgrade(sources, this.room.controller!)
    })
  }
}
