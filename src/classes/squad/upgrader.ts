import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

interface UpgraderSquadMemory extends SquadMemory {
  // lab_ids?: string[]
  source_link_ids?: string[]
}

export class UpgraderSquad extends Squad {
  private max_energy: number | undefined

  constructor(readonly name: string, readonly room_name: string) {
    super(name)

    const room = Game.rooms[this.room_name]

    if (room && room.controller && room.controller.my) {
      if (room.controller.level == 8) {
        this.max_energy = 2150
      }
      else if (room.controller.level >= 7) {
        this.max_energy = 4300
      }
    }
  }

  public get type(): SquadType {
    return SquadType.UPGRADER
  }

  public static generateNewName(): string {
    return UID(SquadType.UPGRADER)
  }

  public generateNewName(): string {
    return UpgraderSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    if (['W43N5'].indexOf(this.room_name) >= 0) { // W43N5 has no upgrader but manual squad
      return SpawnPriority.NONE
    }

    let max = 0
    const room = Game.rooms[this.room_name]

    if (!room || !room.controller || !room.controller.my || !room.storage || !room.storage.my) {
      return SpawnPriority.NONE
    }

    const energy = room.storage.store.energy
    let available = (energy - 200000)

    if (available > 0) {
      max = Math.floor(available / 130000)
    }

    if (this.room_name == 'W51S29') {
      max = (room.storage.store.energy > 400000) ? 1 : 0
    }

    if (room.controller.level >= 8) {
      max = 1
    }

    return (this.creeps.size < max) ? SpawnPriority.LOW : SpawnPriority.NONE
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    const room = Game.rooms[this.room_name]

    if (this.max_energy) {
      return this.hasEnoughEnergyForUpgrader(energyAvailable, capacity, this.max_energy)
    }

    return this.hasEnoughEnergyForUpgrader(energyAvailable, capacity)
  }

  // --
  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    // capacity: 2300
    // 8 units, 2C, 16W, 9M

    const room = Game.rooms[this.room_name]

    if (this.max_energy) {
      this.addUpgrader(energyAvailable, spawnFunc, CreepType.WORKER, this.max_energy)
      return
    }

    this.addUpgrader(energyAvailable, spawnFunc, CreepType.WORKER)
  }

  public run(): void {
    const squad_memory = Memory.squads[this.name] as UpgraderSquadMemory
    const source_ids = squad_memory.source_link_ids || []
    const room = Game.rooms[this.room_name]
    const is_rcl8 = !(!room) && room.controller && room.controller.my && (room.controller.level == 8)

    let lab: StructureLab | undefined
    let no_lab = ['W43N5'].indexOf(this.room_name) >= 0

    this.creeps.forEach((creep) => {
      if (creep.spawning) {
        return
      }

      const should_boost = !creep.boosted() && ((creep.ticksToLive || 0) > 1450)
      if (should_boost && room && room.owned_structures && !is_rcl8) {
        const boost_compounds: ResourceConstant[] = [RESOURCE_GHODIUM_ACID, RESOURCE_CATALYZED_GHODIUM_ACID]

        if (!lab && !no_lab) {
          const labs = room.owned_structures.get(STRUCTURE_LAB) as StructureLab[]
          lab = labs.filter((l) => {
            if (!l || !l.mineralType) {
              return false
            }
            if (boost_compounds.indexOf(l.mineralType) < 0) {
              return false
            }
            return true
          }).sort(function(lhs, rhs){
            if( lhs!.mineralAmount > rhs!.mineralAmount ) return -1
            if( lhs!.mineralAmount < rhs!.mineralAmount ) return 1
            return 0
          })[0]

          if (!lab || (lab.mineralAmount < 90)) {
            no_lab = true
            lab = undefined
          }
        }

        if (lab) {
          if (lab.boostCreep(creep) == ERR_NOT_IN_RANGE) {
            creep.moveTo(lab)
          }
          return
        }
      }

      creep.upgrade((structure) => {
        // If source is storage and it contains less energy, wait for charge
        if (structure.structureType == STRUCTURE_STORAGE) {
          return true
        }
        return ((structure.structureType == STRUCTURE_LINK) && (source_ids.indexOf(structure.id) >= 0) && (structure.energy > 0))
      })
    })
  }
}
