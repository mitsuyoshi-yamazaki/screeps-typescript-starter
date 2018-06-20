
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

    const base_region = this.regions.get('W51S29')
    const colony_region = this.regions.get('W49S26')

    if ((Game.time % 2) == 0) {
      if (base_region && colony_region && (colony_region.room.controller) && (colony_region.room.controller.my) && (colony_region.room.controller.level <= 4)) {
        const squads: Squad[] = colony_region.squads_need_spawn.filter((squad) => {
          return (squad.type != SquadType.ATTACKER)
            && (squad.type != SquadType.SCOUT)
            && (squad.type != SquadType.TEMP)
        })

        base_region.delegated_squads = squads
      }
    }
    else {
      const grand_child_region = this.regions.get('W48S19')

      if (base_region && grand_child_region && (grand_child_region.room.controller) && (grand_child_region.room.controller.my) && (grand_child_region.room.controller.level <= 4)) {
        const squads: Squad[] = grand_child_region.squads_need_spawn.filter((squad) => {
          return (squad.type != SquadType.ATTACKER)
            && (squad.type != SquadType.SCOUT)
            && (squad.type != SquadType.TEMP)
        })

        base_region.delegated_squads = squads
      }
    }


    const grand_child_region2 = this.regions.get('W48S19')
    if (colony_region && grand_child_region2 && (grand_child_region2.room.controller) && (grand_child_region2.room.controller.my) && (grand_child_region2.room.controller.level <= 4)) {
      const squads: Squad[] = grand_child_region2.squads_need_spawn.filter((squad) => {
        return (squad.type != SquadType.ATTACKER)
          && (squad.type != SquadType.SCOUT)
          && (squad.type != SquadType.TEMP)
      })

      colony_region.delegated_squads = squads
    }

    const grand_child_region3 = this.regions.get('W48S12')
    if (grand_child_region2 && grand_child_region3 && (grand_child_region3.room.controller) && (grand_child_region3.room.controller.my) && (grand_child_region3.room.controller.level <= 4)) {
      const squads: Squad[] = grand_child_region3.squads_need_spawn.filter((squad) => {
        return (squad.type != SquadType.ATTACKER)
          && (squad.type != SquadType.SCOUT)
          && (squad.type != SquadType.TEMP)
      })

      grand_child_region2.delegated_squads = squads
      console.log(`DELEGATED ${grand_child_region3.name} to ${grand_child_region2.name}`)
    }
    else {
      console.log(`!DELEGATED`)
    }

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
