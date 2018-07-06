import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

interface UpgraderSquadMemory extends SquadMemory {
  lab_id?: string
}

export class UpgraderSquad extends Squad {
  constructor(readonly name: string, readonly room_name: string, readonly source_ids: string[]) {
    super(name)
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
    if (['W51S29', 'W43N5'].indexOf(this.room_name) >= 0) {
      return SpawnPriority.NONE
    }

    let max = 0
    const room = Game.rooms[this.room_name]

    if (!room || !room.controller || !room.controller.my || (room.controller.level == 8) || !room.storage || !room.storage.my) {
      return SpawnPriority.NONE
    }

    const energy = room.storage.store.energy
    let available = (energy - 200000)

    if (room.terminal && (room.terminal.store.energy > 200000)) {
      available = Math.max(available, 0)
      available += room.terminal.store.energy
    }

    if (available > 0) {
      max = Math.floor(available / 200000)
    }

    if (this.room_name == 'W44S7') {
      const energy = room.storage.store.energy - 200000
      max = Math.min(Math.floor(energy / 100000), 2)
    }

    return (this.creeps.size < max) ? SpawnPriority.LOW : SpawnPriority.NONE
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    if (this.room_name == 'W44S7') {
      return this.hasEnoughEnergyForUpgrader(energyAvailable, capacity, 3300)
    }

    return this.hasEnoughEnergyForUpgrader(energyAvailable, capacity)
  }

  // --
  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    // capacity: 2300
    // 8 units, 2C, 16W, 9M

    if (this.room_name == 'W44S7') {
      this.addUpgrader(energyAvailable, spawnFunc, 3300)
      return
    }

    this.addUpgrader(energyAvailable, spawnFunc)
  }

  public run(): void {
    const squad_memory = Memory.squads[this.name] as UpgraderSquadMemory
    let lab: StructureLab | undefined

    if (squad_memory.lab_id) {
      lab = Game.getObjectById(squad_memory.lab_id) as StructureLab | undefined
    }

    const boost_compounds: ResourceConstant[] = [RESOURCE_GHODIUM_HYDRIDE, RESOURCE_GHODIUM_ACID, RESOURCE_CATALYZED_GHODIUM_ACID]
    const can_boost = !(!lab)
      && lab.mineralType
      && (boost_compounds.indexOf(lab.mineralType) >= 0)
      && (lab.mineralAmount >= 600)

    this.creeps.forEach((creep) => {
      const should_boost = !creep.boosted && ((creep.ticksToLive || 0) > 1450) && can_boost
      if (lab && should_boost) {
        if (lab.boostCreep(creep) == ERR_NOT_IN_RANGE) {
          creep.moveTo(lab)
        }
        return
      }

      creep.upgrade((structure) => {
        // If source is storage and it contains less energy, wait for charge
        if (structure.structureType == STRUCTURE_STORAGE) {
          return true
        }
        return ((structure.structureType == STRUCTURE_LINK) && (this.source_ids.indexOf(structure.id) >= 0) && (structure.energy > 0))
      })
    })
  }
}
