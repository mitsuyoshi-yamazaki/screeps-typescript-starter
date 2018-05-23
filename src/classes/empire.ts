import { Region } from "./region";

enum State {
  EXPAND = "expand"
}

export class Empire {
  private regions = new Map<string, Region>()

  constructor(readonly name: string, readonly spawns: Map<string, StructureSpawn>) {
    for (const room_name in Game.rooms) {
      const room = Game.rooms[room_name]
      if (!room || !room.controller || !room.controller.my) {
        continue
      }

      try {
        const region = new Region(room.controller!)
        this.regions.set(region.name, region)
      }
      catch(error) {
        const message = `${error}`
        console.log(message)
        Game.notify(message)
      }
    }

    const base_region = this.regions.get('W49S47')//('W44S42')
    const colony_region = this.regions.get('W49S48')//('W48S39')

    if (base_region && colony_region && (colony_region.room.spawns.length == 0)) {
      base_region.delegated_squads = colony_region.squads_need_spawn
    }

    // this.regions.get(first)!.delegated_squads = this.regions.get(third)!.squads_need_spawn

    // // Reassign controller keeper
    // this.regions.forEach((region) => {

    //   const room_keeper = region.room.keeper
    //   if (!room_keeper) {
    //     return
    //   }

    //   Memory.squads[room_keeper!.name]
    // })
  }

  public say(message: string): void {
    this.regions.forEach((region) => {
      region.say(message)
    })
  }

  public run(): void {
    this.regions.forEach((region) => {
      try {
        region.run()
      }
      catch(error) {
        const message = `${error}`
        console.log(message)
        Game.notify(message)
      }
    })
  }
}
