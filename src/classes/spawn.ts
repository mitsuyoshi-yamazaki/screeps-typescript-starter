import { Squad, SquadType, SquadMemory, SpawnPriority, ControllerKeeperSquad, WorkerSquad, ManualSquad } from "classes/squad"
// import { CreepStatus } from "classes/creep"
import { Reply } from "interfaces"

declare global {
  interface StructureSpawn {
    squads: Map<string, Squad>
    worker_squad: WorkerSquad
    manual_squad: ManualSquad
    room_names: string[]
    // towers: StructureTower[]  // @todo:

    initialize(): void
    say(message: string): void
    expand(roomnames: string[]): void
  }

  interface SpawnMemory {
    squad_names: string[]
  }
}

export function init() {
  StructureSpawn.prototype.initialize = function() {
    // Initialize member
    if (this.memory.squad_names == null) {
      this.memory.squad_names = []
    }

    this.squads = new Map<string, Squad>()

    this.room_names = [this.room.name]

    // for (const room_name in Game.rooms) {
    //   const room = Game.rooms[room_name]
    //   this.rooms.push(room)
    // }

    // Memory
    for (const squad_memory of Memory.squads) {
      if (this.name != squad_memory.owner_name) {
        continue
      }

      switch (squad_memory.type) {
      case SquadType.CONTROLLER_KEEPER: {
        const squad = new ControllerKeeperSquad(squad_memory.name, this.room.name) // @fixme define each "room"
        this.squads.set(squad.name, squad)
        this.room.keeper = squad
        break
      }
      case SquadType.WORKER: {
        const squad = new WorkerSquad(squad_memory.name, this.room_names)

        this.worker_squad = squad
        this.squads.set(squad.name, squad)
        break
      }
      case SquadType.MANUAL: {
        const squad = new ManualSquad(squad_memory.name, this.room.name)

        this.manual_squad = squad
        this.squads.set(squad.name, squad)
        break
      }
      default:
        console.log(`Unexpected squad type ${squad_memory}`)
        break
      }
    }

    // Room
    this.room_names.forEach(room_name => {
      const room = Game.rooms[room_name]  // @fixme

      if (room.keeper != null) {
        return
      }

      const name = ControllerKeeperSquad.generateNewName()
      const squad = new ControllerKeeperSquad(name, room_name)

      room.keeper = squad
      this.squads.set(squad.name, squad)
      this.memory.squad_names.push(squad.name)

      const memory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
      }
      Memory.squads.push(memory)

      console.log(`Missing roomkeeper, assigned: ${room.keeper}`)
    })

    // Worker
    if (!this.worker_squad) {
      const name = WorkerSquad.generateNewName()
      const squad = new WorkerSquad(name, this.room_names)

      this.worker_squad = squad
      this.squads.set(squad.name, squad)

      const memory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
      }
      Memory.squads.push(memory)
    }

    // Manual
    if (!this.manual_squad) {
      const name = ManualSquad.generateNewName()
      const squad = new ManualSquad(name, this.room.name)

      this.manual_squad = squad
      this.squads.set(squad.name, squad)

      const memory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
      }
      Memory.squads.push(memory)
    }

    // spawn
    if ((this.spawning == null) && (this.room.energyAvailable >= 50) && (this.squads.size > 0)) {
      const sorted = Array.from(this.squads.values()).sort(function(lhs, rhs) {
        const l_priority = lhs.spawnPriority
        const r_priority = rhs.spawnPriority
        if (l_priority < r_priority) return -1
        else if (l_priority > r_priority) return 1
        else return 0
      })

      const highest_priority = sorted[0].spawnPriority

      if (highest_priority != SpawnPriority.NONE) {
        const availableEnergy = this.room.energyAvailable
        const energyCapacity = this.room.energyCapacityAvailable

        for (const squad of sorted) {
          if (squad.spawnPriority > highest_priority) {
            break
          }
          if (squad.hasEnoughEnergy(availableEnergy, energyCapacity) == false) {
            continue
          }
          squad.addCreep(availableEnergy, (body, name, ops) => { // this closure is to keep 'this'
            return this.spawnCreep(body, name, ops)
          })
          break
        }
      }
    }

    // Construction site
    for (const flag_name in Game.flags) {
      const flag = Game.flags[flag_name]

      if (this.room.createConstructionSite(flag.pos, STRUCTURE_EXTENSION) == OK) {
        flag.remove()

        console.log(`Place extension construction site on ${flag.pos.x}, ${flag.pos.y}`)
        break // If deal with all flags once, createConstructionSite() succeeds each call but when it actually runs (that is the end of the tick) it fails
        // so call it one by one
      }
    }

    // Defend
    // @todo: this codes should be located on somewhere like Empire
    if (Game.time % 2 == 0) {
      const room = this.room

      const attackers = room.find(FIND_HOSTILE_CREEPS, {
          filter: (creep) => {
              return (creep.getActiveBodyparts(ATTACK) +  creep.getActiveBodyparts(RANGED_ATTACK)) > 0;
          }
      })

      if (attackers.length >= 2) {
        console.log('DETECT ', attackers.length, ' ATTACKERS!!! owner: ', attackers[0].owner.username)

        if ((room.controller!.safeMode != undefined) && (room.controller!.safeMode! > 0)) {
          console.log('Safemode active')
        }
        else {
          console.log('Activate safe mode')
          room.controller!.activateSafeMode()
        }
      }
    }
  }

  StructureSpawn.prototype.say = function(message) {
    this.squads.forEach((squad, _) => {
      squad.say(message)
    })
  }

  StructureSpawn.prototype.expand = function(roomnames: string[]) {
    // run squads
    const sources = this.room.sources
    this.squads.forEach((squad, _) => {
      squad.run()
    })
  }
}
