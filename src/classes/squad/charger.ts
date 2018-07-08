import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepTransferLinkToStorageOption, CreepType } from "classes/creep"

export class ChargerSquad extends Squad {
  constructor(readonly name: string, readonly room_name: string, readonly link: StructureLink | undefined, readonly support_links: StructureLink[], readonly creep_position: {x: number, y: number}) {
    super(name)
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
    return energy_available >= 150
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    this.addGeneralCreep(spawn_func, [MOVE, CARRY, CARRY], CreepType.CARRIER)
  }

  public run(): void {
    let link: StructureLink | undefined = this.link
    const opt: CreepTransferLinkToStorageOption = {}

    if (this.support_links.length > 0) {
      opt.has_support_links = true
    }

    if (this.room_name == 'W43N5') {
      link = undefined

      const charge_link = Game.getObjectById('5b35fbc412561956d24fa72a') as StructureLink | undefined
      if (charge_link) {
        opt.additional_links = [
          charge_link
        ]
      }
      else {
        console.log(`NO charge link ${this.name} ${this.room_name}`)
      }
    }

    this.creeps.forEach((creep) => {
      creep.transferLinkToStorage(link, this.creep_position, opt)
    })
  }
}
