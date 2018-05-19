import { Region } from "./region"
import { Squad } from "classes/squad/squad"

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

      const region = new Region(room.controller!)
      this.regions.set(region.name, region)
    }

    if (Game.shard.name == 'swc') {
      const first_region = this.regions.get('E13S19')
      const second_region = this.regions.get('E11S19')
      const third_region = this.regions.get('E17S19')
      // const third_region = this.regions.get('E17S17')

      let first_delegated: Squad[] = []

      if (!(!first_region) && !(!second_region) && (second_region.room.spawns.length == 0)) {
        if (first_region.room.controller && first_region.room.controller.my && ((first_region.room.controller.safeMode || 0) < 2000)) {
          first_delegated = second_region.squads_need_spawn
        }
      }
      if (!(!third_region) && (third_region.room.spawns.length == 0)) {
        // if (!(!second_region) && (second_region.room.spawns.length > 0)) {
        //   second_region.delegated_squads = third_region.squads_need_spawn
        // }
        if (first_region) {
          // first_delegated = first_delegated.concat(third_region.squads_need_spawn)
        }
      }

      if (first_region) {
        first_region.delegated_squads = first_delegated
      }
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
      region.run()
    })
  }
}
