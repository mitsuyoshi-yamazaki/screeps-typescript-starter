
import { ErrorMapper } from "utils/ErrorMapper"
import { Region } from "./region"
import { Squad, SpawnPriority, SquadType } from "./squad/squad";

enum State {
  EXPAND = "expand"
}

export class Empire {
  private regions = new Map<string, Region>()

  constructor(readonly name: string) {
    for (const room_name in Game.rooms) {
      const room = Game.rooms[room_name]
      if (!room || !room.controller || !room.controller.my) {
        continue
      }

      const controller = room.controller

      ErrorMapper.wrapLoop(() => {
        const region = new Region(controller)
        this.regions.set(region.name, region)
      }, `${room.name}.init`)()
    }

    const set_delegate = (base_region_name: string, colony_region_name: string) => {
      ErrorMapper.wrapLoop(() => {

        const base_region = this.regions.get(base_region_name)
        const colony_region = this.regions.get(colony_region_name)

        if (!base_region || !colony_region) {
          if ((Game.time % 29) == 13) {
            const message = `Empire.set_delegate ERROR ${base_region_name} or ${colony_region_name} not found`
            console.log(message)
            // Game.notify(message)
          }
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
      }, `${base_region_name}.set_delegate`)()
    }

    const w51s29 = 'W51S29'
    const w44s7 = 'W44S7'
    const w48s6 = 'W48S6'
    const w43s2 = 'W43S2'
    const w43s5 = 'W43S5'
    const w42n1 = 'W42N1'
    const w47n2 = 'W47N2'
    const w43n5 = 'W43N5'
    const w44n3 = 'W44N3'
    const w49n1 = 'W49N1'
    const w48n11 = 'W48N11'
    const w47n5 = 'W47N5'

    set_delegate(w47n2, w47n5)

    if ((Game.time % 2) == 0) {
      // set_delegate(w47n2, w44n3)
    }
    else {
    }

    if ((Game.time % 5) == 0) {

    }
    else if ((Game.time % 5) == 1) {
    }
    else if ((Game.time % 5) == 2) {

    }
    else {

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
      }, `${region.name}.run`)()
    })
  }
}
