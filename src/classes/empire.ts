
import { ErrorMapper } from "utils/ErrorMapper"
import { Region, RegionOpt } from "./region"
import { Squad, SpawnPriority, SquadType } from "./squad/squad";

enum State {
  EXPAND = "expand"
}

export interface EmpireMemory {
  farm_energy_room: string | null
}

export class Empire {
  private regions = new Map<string, Region>()

  constructor(readonly name: string) {
    if (!Memory.empires[this.name]) {
      Memory.empires[this.name] = {
        farm_energy_room: null
      }
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
    const gcl_farm_rooms: {[room_name: string]: {next: string, base: string}} = {
      W49S6: {next: 'W46S9', base: 'W48S6'},
      W46S9: {next: 'W47S8', base: 'W47S9'},
      W47S8: {next: 'W49S6', base: 'W47S9'},
    }

    let farm_room: {room: Room, controller: StructureController, next: string, base: string} | null = null
    let next_farm: {target_room_name: string, base_room_name: string} | null = null
    let send_to_energy_threshold = 400000

    for (const room_name in gcl_farm_rooms) {
      const room = Game.rooms[room_name]
      if (!room || !room.controller || !room.controller.my) {
        continue
      }
      farm_room = {
        room,
        controller: room.controller,
        ...gcl_farm_rooms[room_name]
      }
      break
    }

    if (farm_room) {
      if (farm_room.controller) {
        switch (farm_room.controller.level) {
          case 1: {
            this.transfer_farm_energy(farm_room.base)
            break
          }

          case 6: {
            if (farm_room.room.terminal) {
              send_to_energy_threshold = 300000

              this.transfer_farm_energy(farm_room.room.name, {with_boosts: true})
            }
            break
          }

          case 7: {
            send_to_energy_threshold = 300000

            const remaining = farm_room.controller.progressTotal - farm_room.controller.progress
            if (remaining < 30000) {
              next_farm = {
                target_room_name: farm_room.next,
                base_room_name: farm_room.base,
              }
            }
            break
          }

          case 8: {
            this.transfer_farm_energy(farm_room.room.name, {stop: true, with_boosts: true})

            if (['W49S6', 'W46S9', 'W47S8'].indexOf(farm_room.room.name) >= 0) {
              farm_room.controller.unclaim()
              const message = `Unclaim farm ${farm_room}`
              console.log(message)
              Game.notify(message)
            }
            else {
              const message = `You're about to unclaim ${farm_room.room.name}!`
              console.log(message)
              Game.notify(message)
            }

            next_farm = {
              target_room_name: farm_room.next,
              base_room_name: farm_room.base,
            }
            break
          }

          default:
            break
        }
      }
    }
    else {
      console.log(`Empire ${this.name} no farm room`)
    }

    // --- Regions
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
        attack_to,
        send_to_energy_threshold,
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
  private transfer_farm_energy(room_name: string, opts?: {stop?: boolean, with_boosts?: boolean}): void {
    opts = opts || {}

    const empire_memory = Memory.empires[this.name]
    if (!empire_memory) {
      console.log(`Empire.transfer_farm_energy ${room_name} no empire memory for ${this.name}`)
      return
    }

    const resource_type = RESOURCE_CATALYZED_GHODIUM_ACID
    const notify = true

    if (opts.stop) {
      if (empire_memory.farm_energy_room && (empire_memory.farm_energy_room == room_name)) {
        Game.transfer_energy(room_name, {stop: true, notify})
        empire_memory.farm_energy_room = null

        if (opts.with_boosts) {
          Game.transfer_resource(resource_type, room_name, {stop: true, notify})
        }
      }
    }
    else {
      if (empire_memory.farm_energy_room && (empire_memory.farm_energy_room != room_name)) {
        Game.transfer_energy(empire_memory.farm_energy_room, {stop: true, notify})
        empire_memory.farm_energy_room = null
      }

      if (!empire_memory.farm_energy_room || (empire_memory.farm_energy_room != room_name)) {
        Game.transfer_energy(room_name, {notify})
        empire_memory.farm_energy_room = room_name

        if (opts.with_boosts) {
          Game.transfer_resource(resource_type, room_name, {notify})
        }
      }
    }
  }

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
