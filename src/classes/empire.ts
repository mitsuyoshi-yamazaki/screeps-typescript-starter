
import { ErrorMapper } from "utils/ErrorMapper"
import { Region } from "./region"
import { Squad, SpawnPriority, SquadType } from "./squad/squad";

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

      ErrorMapper.wrapLoop(() => {
        const region = new Region(room.controller!)
        this.regions.set(region.name, region)
      })()
    }

    // const base_region = this.regions.get('W49S34')
    // const colony_region = this.regions.get('W46S33')

    // if (base_region && colony_region && (colony_region.room.controller) && (colony_region.room.controller.my) && (colony_region.room.controller.level <= 4)) {
    //   const squads: Squad[] = colony_region.squads_need_spawn.filter((squad) => {
    //     return (squad.type != SquadType.ATTACKER)
    //       && (squad.type != SquadType.SCOUT)
    //   })

    //   base_region.delegated_squads = squads
    // }

  }

  public say(message: string): void {
    this.regions.forEach((region) => {
      region.say(message)
    })
  }

  public run(): void {
    this.regions.forEach((region) => {
      ErrorMapper.wrapLoop(() => {
        region.run()
      })()
    })
  }
}
