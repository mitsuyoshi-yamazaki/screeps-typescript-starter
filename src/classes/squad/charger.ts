import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepTransferLinkToStorageOption, CreepType } from "classes/creep"

export class ChargerSquad extends Squad {
  private number_of_carries: number

  public static need_instantiation(memory: SquadMemory, controller: StructureController): boolean {
    const squad_creeps = Game.squad_creeps[memory.name]
    if (squad_creeps && (squad_creeps.length > 0)) {
      return true
    }

    // no creeps
    if (memory.stop_spawming) {
      return false
    }

    if (controller.level < 5) {
      return false
    }

    return this.priority(0) != SpawnPriority.NONE
  }

  private static priority(creeps_size: number): SpawnPriority {
    return creeps_size < 1 ? SpawnPriority.HIGH : SpawnPriority.NONE
  }

  constructor(readonly name: string, readonly room: Room, readonly link: StructureLink | undefined, readonly support_links: StructureLink[], readonly creep_position: {x: number, y: number}) {
    super(name)

    if (!room.controller || !room.controller.my) {
      const message = `ChargerSquad no controller for ${room.name} ${this.name}`
      console.log(message)
      Game.notify(message)

      this.number_of_carries = 2
    }
    else if (room.controller.level == 8) {
      this.number_of_carries = 4
    }
    else if (room.controller.level >= 7) {
      this.number_of_carries = 3
    }
    else {
      this.number_of_carries = 2
    }
  }

  public get type(): SquadType {
    return SquadType.CHARGER
  }

  public static generateNewName(): string {
    return UID(SquadType.CHARGER)
  }

  public generateNewName(): string {
    return ChargerSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    return ChargerSquad.priority(this.creeps.size)
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    const energy_unit = 100
    const needs = (this.number_of_carries * energy_unit) + 50

    return energy_available >= needs
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    let body: BodyPartConstant[] = []

    const body_unit = [CARRY, CARRY]

    for (let i = 0; i < this.number_of_carries; i++) {
      body = body.concat(body_unit)
    }
    body = body.concat([MOVE])

    this.addGeneralCreep(spawn_func, body, CreepType.CARRIER)
  }

  public run(): void {
    let link: StructureLink | undefined = this.link
    const opt: CreepTransferLinkToStorageOption = {}

    if (this.support_links.length > 0) {
      opt.has_support_links = true
    }

    // if ((this.room.name == 'W55S23')) {
    //   opt.transfer_energy = true
    // }

    this.creeps.forEach((creep) => {
      creep.transferLinkToStorage(link, this.creep_position, opt)

      // if (creep.carry.energy) {
      //   const rampart = creep.pos.findInRange(FIND_MY_STRUCTURES, 1, {
      //     filter: (structure: OwnedStructure) => {
      //       return structure.structureType == STRUCTURE_RAMPART
      //     }
      //   })[0]

      //   if (rampart) {
      //     creep.repair(rampart)
      //   }
      // }
    })
  }
}
