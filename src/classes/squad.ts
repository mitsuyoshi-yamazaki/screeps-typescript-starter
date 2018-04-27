import { Reply } from "interfaces"

enum Status {
  HARVEST = "harvest",
  UPGRADE = "upgrade",
}

export enum SquadType {
  CONTROLLER_KEEPER = "controller_keeper",
}

export class Squad {
  public readonly creeps = new Map<string, Creep>()

  public static generateNewID(): string {
    return `Squad${Game.time}`
  }

  constructor(readonly id: string, readonly type: SquadType) {
    for (const creep_name in Game.creeps) {
      const creep = Game.creeps[creep_name]
      if (creep.memory.squad_id != id) {
        continue
      }

      this.creeps.set(creep.id, creep)
    }
  }

  public say(message: string): void {
    this.creeps.forEach((creep, _) => {
      creep.say(message)
    })
  }

  public harvest(source: Source): void {
    console.log(`Harvest ${source}`)

    this.creeps.forEach((creep, _) => {
      // creep.say(message)
    })
  }

  public upgrade(sources: Source[], target: StructureController): void {
    console.log(`Upgrade ${target}`)

    this.creeps.forEach((creep, _) => {
      creep.upgrade(sources[0], target)
    })
  }
}
