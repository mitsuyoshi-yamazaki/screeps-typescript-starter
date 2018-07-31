import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

interface UpgraderSquadMemory extends SquadMemory {
  // lab_ids?: string[]
  source_link_ids?: string[]
}

export class UpgraderSquad extends Squad {
  private max_energy: number | undefined

  constructor(readonly name: string, readonly room_name: string, readonly additional_source_ids: string[]) {
    super(name)

    const room = Game.rooms[this.room_name]

    if (room && room.controller && room.controller.my) {
      if (room.controller.level == 8) {
        this.max_energy = 1150
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
    if (['dummy'].indexOf(this.room_name) >= 0) { // W43N5 has no upgrader but manual squad
      return SpawnPriority.NONE
    }

    const squad_memory = Memory.squads[this.name]
    if (squad_memory.stop_spawming) {
      return SpawnPriority.NONE
    }

    let max = 0
    const room = Game.rooms[this.room_name]

    if (!room || !room.controller || !room.controller.my || !room.storage || !room.storage.my) {
      return SpawnPriority.NONE
    }

    // if (room.controller.level == 8) {
    //   return SpawnPriority.NONE
    // }

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
      this.addUpgrader(energyAvailable, spawnFunc, CreepType.WORKER, {max_energy: this.max_energy})
      return
    }

    this.addUpgrader(energyAvailable, spawnFunc, CreepType.WORKER)
  }

  public run(): void {
    const squad_memory = Memory.squads[this.name] as UpgraderSquadMemory
    const source_ids = (squad_memory.source_link_ids || []).concat(this.additional_source_ids)
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

          if (labs) { // why?
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
        if (source_ids.indexOf(structure.id) >= 0) {
          const has_store = structure as {store?: StoreDefinition}
          if (has_store.store && (has_store.store.energy > 0)) {
            return true
          }

          const has_energy = structure as {energy?: number}

          if (has_energy.energy && (has_energy.energy > 0)) {
            return true
          }
        }
        return false
      })
    })
  }
}
