
import { ErrorMapper } from "utils/ErrorMapper"
import { Region, RegionOpt } from "./region"
import { Squad, SpawnPriority, SquadType } from "./squad/squad";

enum State {
  EXPAND = "expand"
}

export class Empire {
  private regions = new Map<string, Region>()

  constructor(readonly name: string) {

    const attacker_room_names = [
      'W42N1',
      'W47N2',
      'W43S5',
      'W43N5',
      'W44S7',
      'W48S6',
    ]
    const attack_to = 'W44N3'

    for (const room_name in Game.rooms) {
      const room = Game.rooms[room_name]
      if (!room || !room.controller || !room.controller.my) {
        continue
      }

      const controller = room.controller
      const opt: RegionOpt = {
        produce_attacker: (attacker_room_names.indexOf(room.name) >= 0),
        attack_to: attack_to,
      }

      ErrorMapper.wrapLoop(() => {
        const region = new Region(controller, opt)
        this.regions.set(region.name, region)
      }, `${room.name}.init`)()
    }

    const set_delegate = (base_region_name: string, colony_region_name: string, excludes?: SquadType[]) => {
      ErrorMapper.wrapLoop(() => {
        const excludes_opt = excludes || [
          SquadType.ATTACKER,
          SquadType.SCOUT,
          SquadType.TEMP,
        ]

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
            return excludes_opt.indexOf(squad.type) < 0
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
    const w47s6 = 'W47S6'

    set_delegate(w48s6, w47s6)
    // set_delegate(w47n2, w47n5)//, [
    //   SquadType.ATTACKER,
    //   SquadType.SCOUT,
    //   SquadType.TEMP,
    //   SquadType.REMOET_HARVESTER,
    //   // SquadType.REMOET_M_HARVESTER,
    // ])
    // set_delegate(w43n5, w47n5)

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
