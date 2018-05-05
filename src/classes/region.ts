export class Region {
  public get room(): Room {
    return this.controller.room
  }

  private spawns: StructureSpawn[] = []

  constructor(readonly controller: StructureController) {
    if (!controller || !controller.my) {
      const message = `Region() controller not provided or not mine ${controller}`
      console.log(message)
      Game.notify(message)
      return
    }

    this.spawns = this.room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return structure.structureType == STRUCTURE_SPAWN
      }
    }) as StructureSpawn[]
  }

  public say(message: string): void {
    this.spawns.forEach((spawn, spawnID) => {
      spawn.say(message)
    })
  }

  public expand(roomnames: string[]): void {
    this.spawns.forEach((spawn, spawnID) => {
      spawn.expand(roomnames)
    })
  }
}
