
import { ErrorMapper } from "utils/ErrorMapper"
import { Region, RegionOpt } from "./region"
import { Squad, SpawnPriority, SquadType } from "./squad/squad";

enum State {
  EXPAND = "expand"
}

export interface EmpireMemory {
  farm?: {room_name:string, progress:number}
}

export class Empire {
  private regions = new Map<string, Region>()

  constructor(readonly name: string) {
    if (!Memory.empires[this.name]) {
      Memory.empires[this.name] = {}
    }

    // --- Attack
    const attacker_room_names: string[] = [
    ]
    const attack_to: string | null = null

    // --- Claim
    let claim_to: {target_room_name: string, base_room_name: string, forced: boolean, at_level?: number} | null = {
      target_room_name: 'E13N45',
      base_room_name: 'W55S23',
      forced: true,
      at_level: 15,
    }

    if (claim_to.at_level && (Game.gcl.level < claim_to.at_level)) {
      claim_to = null
    }
    if (claim_to) {
      this.setDelegate(claim_to.base_room_name, claim_to.target_room_name)
    }

    // --- GCL Farm
    const gcl_farm_rooms = [
      'W49S6',
      'W46S9',
      'W47S8',
    ]

    let next_farm: {target_room_name: string, base_room_name: string} | null = {
      target_room_name: 'W47S8',
      base_room_name: 'W47S9',
    }
    const replace_farm = true

    if (replace_farm) {
      next_farm = null
    }

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

      if (next_farm && (next_farm.base_room_name == room.name)) {
        opt.temp_squad_opt = {
          target_room_name: next_farm.target_room_name,
          forced: false,
        }
      }
      else if (claim_to && (claim_to.base_room_name == room.name)) {
        opt.temp_squad_opt = {
          target_room_name: claim_to.target_room_name,
          forced: claim_to.forced,
        }
      }

      ErrorMapper.wrapLoop(() => {
        const region = new Region(controller, opt)
        this.regions.set(region.name, region)
      }, `${room.name}.init`)()
    }

    const w51s29 = 'W51S29'
    const w44s7 = 'W44S7'
    const w48s6 = 'W48S6'
    const w43s5 = 'W43S5'
    const w47s6 = 'W47S6'
    const w45s27 = 'W45S27'
    // const w39s9 = 'W39S9'
    const w47s9 = 'W47S9'
    // const w45s3 = 'W45S3'
    const w49s6 = 'W49S6'
    const w46s3 = 'W46S3'
    const e16n37 = 'E16N37'
    const w56s7 = 'W56S7'
    const w55s23 = 'W55S23'
    const w55s13 = 'W55S13'
    const w58s4 = 'W58S4'

    const time = (Game.time % 3)

    // set_delegate(w56s7, w58s4, {max_rcl: 4})

    if (time == 2) {
    }
    else if (time == 0) {
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

  // --- Private
  private setDelegate(base_region_name: string, colony_region_name: string, opts?: {excludes?: SquadType[], max_rcl?: number}): void {
    ErrorMapper.wrapLoop(() => {
      opts = opts || {}

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

      if (opts.max_rcl && (colony_region.controller.level > opts.max_rcl)) {
        return
      }

      const includes_opt = [
        SquadType.REMOET_HARVESTER,
        SquadType.REMOET_M_HARVESTER,
      ]

      let excludes_opt: SquadType[]
      if (opts.excludes) {
        excludes_opt = opts.excludes
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
}
