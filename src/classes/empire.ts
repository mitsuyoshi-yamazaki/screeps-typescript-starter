import { Reply } from 'interfaces'

enum State {
  EXPAND = 'expand',
}

export class Empire {
  constructor(readonly name: string, readonly spawns: Map<string, StructureSpawn>) {
    this.spawns.forEach((spawn, _) => {
      spawn.initialize()
    })
  }

  say(message: string): void {
    this.spawns.forEach((spawn, spawnID) => {
      spawn.say(message)
    })
  }

  expand(roomnames: string[]): void {
    this.spawns.forEach((spawn, spawnID) => {
      spawn.expand(roomnames)
    })
  }
}
