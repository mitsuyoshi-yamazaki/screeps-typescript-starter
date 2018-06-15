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
    let max = 0
    const room = Game.rooms[this.room_name]

    if (!room || !room.controller || !room.controller.my || (room.controller.level == 8)) {
      return SpawnPriority.NONE
    }

    if (room && room.storage) {
      const energy = room.storage!.store.energy
      let available = (energy - 400000)

      if (room.terminal && (room.terminal.store.energy > 120000)) {
        available = Math.max(available, 0)
        available += room.terminal.store.energy
      }

      if (available > 0) {
        max = Math.floor(available / 150000)
      }
    }

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

    energyAvailable = Math.min(energyAvailable, 2300)

    const move: BodyPartConstant[] = [MOVE]
    const work: BodyPartConstant[] = [WORK, WORK]
    const energy_unit = 250

    energyAvailable -= 150
    const header: BodyPartConstant[] = [CARRY, CARRY]
    let body: BodyPartConstant[] = [MOVE]
    const name = this.generateNewName()
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.WORKER,
      should_notify_attack: false,
      let_thy_die: false,
    }

    while (energyAvailable >= energy_unit) {
      body = move.concat(body)
      body = body.concat(work)
      energyAvailable -= energy_unit
    }
    body = header.concat(body)

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  public run(): void {
    this.creeps.forEach((creep) => {
      // const needs_renew = !creep.memory.let_thy_die && ((creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || ((creep.ticksToLive || 0) < 400))

      // if (needs_renew) {
      //   if ((creep.room.spawns.length > 0) && (creep.room.energyAvailable > 0)) {
      //     creep.goToRenew(creep.room.spawns[0])
      //     return
      //   }
      //   else if (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) {
      //     creep.memory.status = CreepStatus.HARVEST
      //   }
      // }

      // if ((creep.boosted == false) && (creep.room.name == 'W48S47')) {
      //   const lab = Game.getObjectById('5af458a11ad10d5415bba8f2') as StructureLab
      //   if ((lab.mineralType == RESOURCE_CATALYZED_GHODIUM_ACID) && (lab.mineralAmount > 500)) {
      //     creep.say('🔥')
      //     if (lab.boostCreep(creep) == ERR_NOT_IN_RANGE) {
      //       creep.moveTo(lab)
      //     }
      //     return
      //   }
      // }

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
