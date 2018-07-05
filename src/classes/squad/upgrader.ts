import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

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

    // if ((this.room_name == 'W48S6') && room && room.storage && (room.storage.store.energy > 10000)) {
    //   const max = Math.floor(room.storage.store.energy / 10000)
    //   return (this.creeps.size < max) ? SpawnPriority.LOW : SpawnPriority.NONE
    // }

    if (!room || !room.controller || !room.controller.my || (room.controller.level == 8)) {
      return SpawnPriority.NONE
    }

    if (room && room.storage && room.storage.my) {
      const energy = room.storage!.store.energy
      let available = (energy - 200000)

      if (room.terminal && (room.terminal.store.energy > 200000)) {
        available = Math.max(available, 0)
        available += room.terminal.store.energy
      }

      if (available > 0) {
        max = Math.floor(available / 200000)
      }
    }

    // if ((this.room_name == 'W49S47') && room.storage && (room.storage.store.energy > 30000) && room.controller && (room.controller.level < 8)) {
    //   return (this.creeps.size < 1) ? SpawnPriority.LOW : SpawnPriority.NONE
    // }

    return (this.creeps.size < max) ? SpawnPriority.LOW : SpawnPriority.NONE
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    capacity = Math.min(capacity, 2300)

    const energy_unit = 250
    const energyNeeded = (Math.floor((capacity - 150) / energy_unit) * energy_unit)
    return energyAvailable >= energyNeeded
  }

  // --
  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    // capacity: 2300
    // 8 units, 2C, 16W, 9M

    this.addUpgrader(energyAvailable, spawnFunc)
  }

  public run(): void {
    this.creeps.forEach((creep) => {
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
