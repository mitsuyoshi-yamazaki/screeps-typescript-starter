import { Reply } from 'interfaces'

enum Status {
  HARVEST = 'harvest',
}

export class Squad {
  readonly creeps = new Map<string, Creep>()

  static generateNewID(): string {
    return `Squad${Game.time}`
  }

  constructor(readonly id: string) {
    for (const creep_name in Game.creeps) {
      const creep = Game.creeps[creep_name]
      if ((creep.memory as any)['squad_id'] as string != id) {
        continue
      }

      this.creeps.set(creep.id, creep)
    }
  }

  say(message: string): void {
    this.creeps.forEach((creep, _) => {
      // creep.say(message)
      creep.say(`${this.id}!`)
    })
  }

  harvest(source: Source): void {
    console.log(`Harvest ${source}`)
  }
}
