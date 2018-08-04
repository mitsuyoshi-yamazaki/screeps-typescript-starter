
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
      // 'W42N1',
      'W47N2',
      // 'W43S5',
      // 'W43N5',
      // 'W44S7',
      // 'W48S6',
    ]
    const attack_to = 'W44N3'

    for (const room_name in Game.rooms) {
      const room = Game.rooms[room_name]
      if (!room || !room.controller || !room.controller.my) {
        continue
      }

      const room_memory = Memory.rooms[room_name]
      if (room_memory && room_memory.is_gcl_farm) {
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
        const base_region = this.regions.get(base_region_name)
        const colony_region = this.regions.get(colony_region_name)

        if (!base_region || !colony_region || !colony_region.controller.my) {
          if ((Game.time % 29) == 13) {
            const message = `Empire.set_delegate ERROR ${base_region_name} or ${colony_region_name} not found`
            console.log(message)
            // Game.notify(message)
          }
          return
        }

        const includes_opt = [
          SquadType.REMOET_HARVESTER,
          SquadType.REMOET_M_HARVESTER,
        ]

        let excludes_opt: SquadType[]
        if (excludes) {
          excludes_opt = excludes
        }
        else if (colony_region.room.spawns.length > 0) {
          excludes_opt = [
            SquadType.ATTACKER,
            SquadType.SCOUT,
            SquadType.TEMP,
            SquadType.CHARGER,
          ]

          if ((colony_region.controller.level >= 3) && (colony_region.room.energyCapacityAvailable >= 600)) {
            excludes_opt.push(SquadType.HARVESTER)
          }
          if ((colony_region.controller.level >= 4) && (colony_region.room.energyCapacityAvailable >= 1800)) {
            excludes_opt.push(SquadType.WORKER)
            excludes_opt.push(SquadType.MANUAL)
            excludes_opt.push(SquadType.RESEARCHER)
            excludes_opt.push(SquadType.UPGRADER)
          }
        }
        else {
          excludes_opt = []
        }

        if ((colony_region.controller.level <= 5)) {
          const squads: Squad[] = colony_region.squads_need_spawn.filter((squad) => {
            return excludes_opt.indexOf(squad.type) < 0
          })

          base_region.delegated_squads = squads
        }
        else if (colony_region.controller.level <= 6) {
          const squads: Squad[] = colony_region.squads_need_spawn.filter((squad) => {
            return includes_opt.indexOf(squad.type) >= 0
          })

          base_region.delegated_squads = squads
        }
      }, `${base_region_name}.set_delegate`)()
    }

    const w51s29 = 'W51S29'
    const w44s7 = 'W44S7'
    const w48s6 = 'W48S6'
    const w43s5 = 'W43S5'
    const w47s6 = 'W47S6'
    const w45s27 = 'W45S27'
    // const w39s9 = 'W39S9'
    // const w47s14 = 'W47S14'
    const w47s9 = 'W47S9'
    // const w45s3 = 'W45S3'
    const w49s6 = 'W49S6'
    const w46s3 = 'W46S3'
    const e16n37 = 'E16N37'
    const w56s7 = 'W56S7'

    const time = (Game.time % 3)

    set_delegate(w47s6, w46s3)
    // set_delegate(w48s6, w56s7)
    // set_delegate(w43s5, e16n37)

    if (time == 2) {
      // set_delegate(w48s6, w47s6)
      // set_delegate(w51s29, w45s27)
    }
    else if (time == 0) {
      // set_delegate(w48s6, w49s6)
    }
    else {
      // set_delegate(w48s6, w47s9)
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
