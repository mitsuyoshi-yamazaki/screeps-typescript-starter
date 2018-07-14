import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepTransferLinkToStorageOption, CreepType } from "classes/creep"

export class ChargerSquad extends Squad {
  private energy_max: number

  constructor(readonly name: string, readonly room: Room, readonly link: StructureLink | undefined, readonly support_links: StructureLink[], readonly creep_position: {x: number, y: number}) {
    super(name)

    if (!room.controller || !room.controller.my) {
      const message = `ChargerSquad no controller for ${room.name} ${this.name}`
      console.log(message)
      Game.notify(message)

      this.energy_max = 150
    }
    else if (room.controller.level == 8) {
      this.energy_max = 450
    }
    else if (room.controller.level == 8) {
      this.energy_max = 300
    }
    else {
      this.energy_max = 150
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
    return this.creeps.size < 1 ? SpawnPriority.HIGH : SpawnPriority.NONE
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    return energy_available >= this.energy_max
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    let energy = this.energy_max
    let body: BodyPartConstant[] = []

    const energy_unit = 150
    const body_unit = [MOVE, CARRY, CARRY]

    while(energy >= energy_unit) {
      body = body.concat(body_unit)
      energy -= energy_unit
    }

    this.addGeneralCreep(spawn_func, body, CreepType.CARRIER)
  }

  public run(): void {
    let link: StructureLink | undefined = this.link
    const opt: CreepTransferLinkToStorageOption = {}

    if (this.support_links.length > 0) {
      opt.has_support_links = true
    }

    if (this.room.name == 'W43N5') {
      link = undefined

      const charge_link = Game.getObjectById('5b35fbc412561956d24fa72a') as StructureLink | undefined
      if (charge_link) {
        opt.additional_links = [
          charge_link
        ]
      }
      else {
        console.log(`NO charge link ${this.name} ${this.room.name}`)
      }
    }

    this.creeps.forEach((creep) => {
      creep.transferLinkToStorage(link, this.creep_position, opt)
    })
  }
}
