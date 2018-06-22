
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

      const controller = room.controller

      ErrorMapper.wrapLoop(() => {
        const region = new Region(controller)
        this.regions.set(region.name, region)
      })()
    }

    const set_delegate = (base_region_name: string, colony_region_name: string) => {
      ErrorMapper.wrapLoop(() => {

        const base_region = this.regions.get(base_region_name)
        const colony_region = this.regions.get(colony_region_name)

        if (!base_region || !colony_region) {
          const message = `Empire.set_delegate ERROR ${base_region_name} or ${colony_region_name} not found`
          console.log(message)
          Game.notify(message)
          return
        }

        if ((colony_region.room.controller) && (colony_region.room.controller.my) && (colony_region.room.controller.level <= 5)) {//4)) {
          const squads: Squad[] = colony_region.squads_need_spawn.filter((squad) => {
            return (squad.type != SquadType.ATTACKER)
              && (squad.type != SquadType.SCOUT)
              && (squad.type != SquadType.TEMP)
          })

          base_region.delegated_squads = squads
        }
      })()
    }

    const w51s29 = 'W51S29'
    // const w49s26 = 'W49S26'
    const w49s19 = 'W49S19'
    const w44s7 = 'W44S7'
    const w48s6 = 'W48S6'
    // const w38s7 = 'W38S7'
    const w43s2 = 'W43S2'
    const w43s5 = 'W43S5'

    if ((Game.time % 2) == 0) {
      // set_delegate(w51s29, w49s26)
    }
    else {
    }

    if ((Game.time % 5) == 0) {
      // set_delegate(w38s7, w33s7)
    }
    else if ((Game.time % 5) == 1) {
      // set_delegate(w44s7, w38s7)
      // set_delegate(w49s26, w44s7)
    }
    else if ((Game.time % 5) == 2) {
      set_delegate(w44s7, w43s2)
    }
    else {
      set_delegate(w44s7, w43s5)
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
