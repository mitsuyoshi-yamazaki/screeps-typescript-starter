import { ErrorMapper } from "utils/ErrorMapper"
import { Squad, SquadType, SquadMemory, SpawnPriority } from "classes/squad/squad"
import { ControllerKeeperSquad, ControllerKeeperSquadMemory } from "classes/squad/controller_keeper"
import { WorkerSquad } from "classes/squad/worker"
import { ManualSquad } from "classes/squad/manual"
import { HarvesterSquad, HarvesterSquadMemory } from "./squad/harvester"
import { ScoutSquad } from "classes/squad/scout"
import { CreepStatus, ActionResult, CreepType } from "./creep"
import { AttackerSquad } from "./squad/attacker"
import { UpgraderSquad } from "./squad/upgrader";
import { RaiderSquad, RaiderTarget } from "./squad/raider";
import { ResearcherSquad, ResearchTarget } from "./squad/researcher";
import { LightWeightHarvesterSquad } from "./squad/lightweight_harvester";
import { InvaderSquad } from "./squad/invader";
import { TempSquad } from "./squad/temp";
import { GuardSquad } from "./squad/guard";
import { ChargerSquad } from './squad/charger';
import { RemoteHarvesterSquad, RemoteHarvesterSquadMemory } from './squad/remote_harvester';
import { RemoteMineralHarvesterSquad, RemoteMineralHarvesterSquadMemory } from "./squad/remote_m_harvester";
import { RemoteDefenderSqauad } from "./squad/remote_defender";

export interface RegionMemory {
  reaction_outputs?: string[]
  reaction_output_excludes?: string[]
  support_link_ids?: string[]
  resource_transports?: {[room_name: string]: ResourceConstant[]}
  last_spawn_time: number
}

export class Region {
  // Public
  public get room(): Room {
    return this.controller.room
  }
  public get name(): string {
    return this.room.name
  }
  public delegated_squads: Squad[] = []
  public squads_need_spawn: Squad[] = []

  // Private
  private squads = new Map<string, Squad>()
  private destination_link_id: string | undefined
  worker_squad: WorkerSquad
  private upgrader_squad: UpgraderSquad
  private manual_squad: ManualSquad | undefined
  private scout_squad: ScoutSquad | undefined
  private defend_squad: AttackerSquad | undefined
  private room_names: string[] = []
  private towers: StructureTower[] = []
  private spawns = new Map<string, StructureSpawn>()
  private attacked_rooms: string[] = []
  private temp_squad_target_room_name: string | undefined

  private get support_link_ids(): string[] {
    const region_memory = Memory.regions[this.name]
    if (!region_memory || !region_memory.support_link_ids) {
      return []
    }
    return region_memory.support_link_ids
  }

  constructor(readonly controller: StructureController) {
    if (!controller || !controller.my) {
      const message = `Region() controller not provided or not mine ${controller}`
      console.log(message)
      Game.notify(message)

      // dummy
      this.worker_squad = new WorkerSquad('', '')
      this.upgrader_squad = new UpgraderSquad('', this.room.name)
      return
    }

    if (!Memory.regions[this.name]) {
      Memory.regions[this.name] = {
        last_spawn_time: Game.time,
      }
    }
    const region_memory = Memory.regions[this.name]

    // Spawns
    if (this.room.owned_structures) {
      const spawn_list = this.room.owned_structures.get(STRUCTURE_SPAWN)

      if (spawn_list) {
        spawn_list.forEach((structure) => {
          const spawn = structure as StructureSpawn
          this.spawns.set(spawn.name, spawn)
        })
      }
    }

    if ((this.spawns.size == 0)) {
      if (this.room.controller && (this.room.controller.level >= 3)) {
        this.room.owned_structures_not_found_error(STRUCTURE_SPAWN)
      }
      this.room.find(FIND_MY_SPAWNS).forEach((spawn) => {
        this.spawns.set(spawn.name, spawn)
      })
    }

    this.spawns.forEach((spawn, _) => {
      spawn.initialize()
    })

    // --- Initialize variables ---
    const storage = (this.room.storage && this.room.storage.my) ? this.room.storage : undefined
    const terminal = (this.room.terminal && this.room.terminal.my) ? this.room.terminal : undefined
    // const spawn = this.room.spawns[0]

    // const container = this.room.find(FIND_STRUCTURES, {
    //   filter: structure => {
    //     return (structure.structureType == STRUCTURE_CONTAINER)
    //   }
    // })[0] as StructureContainer

    let harvester_targets: {id: string, room_name: string}[] = []
    let harvester_destination: StructureStorage | StructureTerminal | StructureContainer = (storage || terminal) as (StructureStorage | StructureTerminal) // @fixme: null check // || container
    let lightweight_harvester_targets: {id: string, room_name: string}[] = []
    let rooms_need_scout: string[] = []
    let rooms_need_to_be_defended: string[] = []
    let research_input_targets: ResearchTarget[] = []
    let research_output_targets: ResearchTarget[] = []
    const energy_capacity = this.room.energyCapacityAvailable - 50
    let charger_position: {x: number, y: number} | undefined
    let input_lab_ids: {lhs: string, rhs: string} | undefined

    switch (this.room.name) {
      case 'W51S29':
        harvester_targets = [
          { id: '59f19fd382100e1594f35a4c', room_name: 'W51S29' }, // bottom right
          { id: '59f19fd382100e1594f35a4b', room_name: 'W51S29' }, // bottom center
          { id: '59f1c0ce7d0b3d79de5f0165', room_name: 'W51S29' }, // Lemergium
        ]
        this.room_names = [this.room.name]
        rooms_need_scout = []//['W51S21']
        input_lab_ids = {
          lhs: '5b2552233deea0034025a183', // 30, 18
          rhs: '5b2585544218cc4736554b87', // 31, 17
        }
        this.destination_link_id = '5b1f028bb08a2b269fba0f6e'
        charger_position = {x: 24, y: 21}
        break

      case 'W44S7':
        harvester_targets = [
          { id: '59f1a03882100e1594f36569', room_name: 'W44S7' } , // top
          { id: '59f1a03882100e1594f3656b', room_name: 'W44S7' } , // bottom
          { id: '59f1c0cf7d0b3d79de5f037c', room_name: 'W44S7' } , // hydrogen
        ]
        lightweight_harvester_targets = [
          { id: '59f1a04682100e1594f3673d', room_name: 'W43S7' }, // left
          { id: '59f1a04682100e1594f3673e', room_name: 'W43S7' }, // bottom
          { id: '59f1a02a82100e1594f36330', room_name: 'W45S7' },
          { id: '59f1a04682100e1594f3673a', room_name: 'W43S6' }, // bottom left
          { id: '59f1a04682100e1594f36739', room_name: 'W43S6' }, // center
          { id: '59f1a02a82100e1594f36333', room_name: 'W45S8' },
          { id: '59f1a01a82100e1594f360fa', room_name: 'W46S7' },
          // { id: '59f1a03882100e1594f3656d', room_name: 'W44S8' }, // left
          // { id: '59f1a03882100e1594f3656f', room_name: 'W44S8' }, // bottom
          { id: '59f1a05a82100e1594f368c7', room_name: 'W42S7' }, // bottom
          { id: '59f1a05a82100e1594f368c6', room_name: 'W42S7' }, // bottom right
        ]
        this.room_names = [this.room.name]
        rooms_need_scout = [
          'W43S7',
          'W45S7',
          'W43S6',
          'W45S8',
          'W46S7',
          // 'W44S8',
          'W42S7',
        ]
        rooms_need_to_be_defended = [
          'W43S7',
          'W45S7',
          'W43S6',
          'W45S8',
          'W46S7',
          'W44S8',
          'W42S7',
        ]
        this.destination_link_id = '5b2e775359615412454b065e'
        charger_position = {x: 19, y: 42}
        input_lab_ids = {
          lhs: '5b3b4987f8c7fa739a68e406', // 18, 32
          rhs: '5b32af23c3f6e64781782851', // 17, 33
        }
        break

      case 'W48S6':
        lightweight_harvester_targets = [
          { id: '59f19feb82100e1594f35c05', room_name: 'W49S6' }, // bottom
          { id: '59f19feb82100e1594f35c03', room_name: 'W49S6' }, // top
          // { id: '59f19ffa82100e1594f35d7e', room_name: 'W48S5' }, // bottom left
          // { id: '59f19ffa82100e1594f35d7d', room_name: 'W48S5' }, // center
          { id: '59f19ffa82100e1594f35d85', room_name: 'W48S7' },
          // { id: '59f19feb82100e1594f35c00', room_name: 'W49S5' }, // top right
          // { id: '59f19feb82100e1594f35c01', room_name: 'W49S5' }, // center
        ]
        harvester_targets = [
          { id: '59f19ffa82100e1594f35d81', room_name: 'W48S6' }, // center
          { id: '59f19ffa82100e1594f35d82', room_name: 'W48S6' }, // bottom
          { id: '59f1c0ce7d0b3d79de5f0228', room_name: 'W48S6' }, // hydrogen
        ]
        this.room_names = [this.room.name]
        rooms_need_scout = [
          'W49S6',
          // 'W48S5',
          'W48S7',
          'W49S5',
        ]
        rooms_need_to_be_defended = [
          // 'W49S6',
          'W48S5',
          'W48S7',
          'W49S5',
        ]
        charger_position = {x: 35, y: 22}
        this.destination_link_id = '5b34e943bb6c0934e8274579'
        input_lab_ids = {
          lhs: '5b358e1d24c2d964cdd22578', // 41, 22
          rhs: '5b35ab4b2ffd7a7b7f48fb7d', // 42, 21
        }
        break

      case 'W43S5':
        lightweight_harvester_targets = [
          { id: '59f1a05982100e1594f368be', room_name: 'W42S5' },
          // { id: '59f1a04682100e1594f36732', room_name: 'W43S4' },
          // { id: '59f1a02982100e1594f36321', room_name: 'W45S5' }, // top right
          { id: '59f1a05982100e1594f368bb', room_name: 'W42S4' }, // bottom
        ]
        harvester_targets = [
          { id: '59f1a04682100e1594f36736', room_name: 'W43S5' },
          { id: '59f1c0cf7d0b3d79de5f03d7', room_name: 'W43S5' }, // utrium
        ]
        this.room_names = [this.room.name]
        rooms_need_scout = [
          'W42S5',
          'W43S4',
          'W42S4',
        ]
        rooms_need_to_be_defended = [
          'W42S5',
          'W43S4',
          'W42S4',
          // 'W45S5',
        ]
        this.destination_link_id = '5b317f135c9e085b93bedf0c'
        charger_position = {x: 19, y: 16}
        input_lab_ids = {
          lhs: '5b3a25ac4db5b770faec5a37', // 15, 11
          rhs: '5b3a1d976ee50a3f1cb8e34f', // 16, 10
        }
        break

      case 'W42N1':
        lightweight_harvester_targets = [
          // { id: '59f1a05882100e1594f368a6', room_name: 'W42N2' }, // bottom
          // { id: '59f1a05882100e1594f368a5', room_name: 'W42N2' }, // top
          { id: '59f1a06782100e1594f36a36', room_name: 'W41N1' },
          { id: '59f1a06782100e1594f36a32', room_name: 'W41N2' },
          { id: '59f1a05882100e1594f368a2', room_name: 'W42N3' }, // bottom left
          { id: '59f1a05882100e1594f368a1', room_name: 'W42N3' }, // bottom center
        ]
        harvester_targets = [
          { id: '59f1a05882100e1594f368a8', room_name: 'W42N1' }, // top
          { id: '59f1a05882100e1594f368aa', room_name: 'W42N1' }, // bottom
          { id: '59f1c0cf7d0b3d79de5f043e', room_name: 'W42N1' }, // catalyst
        ]
        this.room_names = [this.room.name]
        rooms_need_scout = [
          'W42N2',
          'W42N3',
          'W41N2',
          'W41N1',
          // 'W47N2',  // fixme: temp
        ]
        rooms_need_to_be_defended = [
          'W42N2',
          'W42N3',
          'W41N2',
          'W41N1',
        ]
        this.destination_link_id = '5b306805ad2c2c3e2216de40'
        charger_position = {x: 24, y: 29}
        input_lab_ids = {
          lhs: '5b3537ffee165b475d3234f2', // 18, 33
          rhs: '5b3526e92ffd7a7b7f48ce2e', // 19, 34
        }
        break

      case 'W47N2':
        lightweight_harvester_targets = [
          { id: '59f1a01882100e1594f360cd', room_name: 'W46N2' },
          // { id: '59f1a00882100e1594f35ee7', room_name: 'W47N3' }, // bottom
          // { id: '59f1a00882100e1594f35ee6', room_name: 'W47N3' }, // top
          { id: '59f1a00882100e1594f35ee3', room_name: 'W47N4' },
          { id: '59f1a02882100e1594f36304', room_name: 'W45N2' },
          { id: '59f1a01882100e1594f360d0', room_name: 'W46N1' },
          { id: '59f1a00882100e1594f35eee', room_name: 'W47N1' },
        ]
        harvester_targets = [
          { id: '59f1a00882100e1594f35eeb', room_name: 'W47N2' }, // left
          { id: '59f1a00882100e1594f35eec', room_name: 'W47N2' }, // right
          { id: '59f1c0ce7d0b3d79de5f028d', room_name: 'W47N2' }, // hydrogen
        ]
        this.room_names = [this.room.name]
        rooms_need_scout = [
          'W46N2',
          'W47N3',
          'W47N4',
          'W45N2',
          'W46N1',
          'W47N1',
        ]
        rooms_need_to_be_defended = [
          'W46N2',
          'W47N3',
          'W47N4',
          'W45N2',
          'W46N1',
          'W47N1',
        ]
        this.destination_link_id = '5b33369c91f5f036a9375bda'
        charger_position = {x: 16, y: 8}
        input_lab_ids = {
          lhs: '5b378bd089b8230740d3f5dd', // 7, 14
          rhs: '5b376efd21b80f301e67dd92', // 8, 15
        }
        // this.temp_squad_target_room_name = 'W47N5'
        break

      case 'W43N5':
        lightweight_harvester_targets = [
          { id: '59f1a04482100e1594f36710', room_name: 'W43N6' },
          { id: '59f1a05782100e1594f36898', room_name: 'W42N6' }, // left
          { id: '59f1a05782100e1594f36896', room_name: 'W42N6' }, // right
          { id: '59f1a05782100e1594f3689b', room_name: 'W42N5' },
          { id: '59f1a04582100e1594f36717', room_name: 'W43N4' },
          { id: '59f1a06782100e1594f36a28', room_name: 'W41N5' },
        ]
        harvester_targets = [
          { id: '59f1a04482100e1594f36714', room_name: 'W43N5' }, // left
          { id: '59f1a04482100e1594f36715', room_name: 'W43N5' }, // right
          { id: '59f1c0cf7d0b3d79de5f03ce', room_name: 'W43N5' }, // zynthium
        ]
        this.room_names = [this.room.name]
        rooms_need_scout = [
          'W43N6',
          'W42N6',
          'W42N5',
          'W43N4',
          'W41N5',
          // 'W43N7',
          // 'W48N11',
        ]
        rooms_need_to_be_defended = [
          'W43N6',
          'W42N6',
          'W42N5',
          'W43N4',
          'W41N5',
        ]
        charger_position = {x: 27, y: 21}
        input_lab_ids = {
          lhs: '5b3be4cc58a02e70ebaa4bdd', // 37, 23
          rhs: '5b3c0baabd00f26bbb6f9aa8', // 36, 24
        }
        break

      case 'W44N3':
        this.room_names = [this.room.name]
        break

      case 'W49N1':
        this.room_names = [this.room.name]
        break

      case 'W48N11':
        harvester_targets = [
          { id: '59f19ff882100e1594f35d48', room_name: 'W48N11' },  // left
          { id: '59f19ff882100e1594f35d49', room_name: 'W48N11' },  // right
          { id: '59f1c0ce7d0b3d79de5f0219', room_name: 'W48N11' },  // oxygen
        ]
        lightweight_harvester_targets = [
          { id: '59f19fe982100e1594f35bce', room_name: 'W49N11' },
          { id: '59f19ff882100e1594f35d46', room_name: 'W48N12' },
          { id: '59f1a00782100e1594f35ecd', room_name: 'W47N11' },
          { id: '59f1a01582100e1594f3609e', room_name: 'W46N11' },
        ]
        this.room_names = [this.room.name]
        rooms_need_scout = [
          'W49N11',
          'W48N12',
          'W47N11',
          'W46N11',
        ]
        rooms_need_to_be_defended = [
          'W49N11',
          'W48N12',
          'W47N11',
          'W46N11',
        ]
        charger_position = {x: 7, y: 39}
        this.destination_link_id = '5b49eb11323c7916916f0a3d'
        input_lab_ids = {
          lhs: '5b49ff838087f443459c9d17', // 3, 43
          rhs: '5b4a1b2e59c3ee4337241aab', // 4, 44
        }
        break

      case 'W47N5':
        harvester_targets = [
          { id: '59f1a00882100e1594f35ee0', room_name: 'W47N5' },
        ]
        this.room_names = [this.room.name]
        break

      default:
        console.log(`Spawn.initialize unexpected region name, ${this.name}`)
        break
    }

    if (region_memory.reaction_outputs && input_lab_ids && this.room.terminal) {
      const output = region_memory.reaction_outputs[0]

      if (output) {
        const ingredients = Game.reactions[output]

        if (ingredients) {
          let finished = false

          if (((Game.time % 101) == 0)) {
            let input_lab_l = Game.getObjectById(input_lab_ids.lhs) as StructureLab | undefined
            let input_lab_r = Game.getObjectById(input_lab_ids.rhs) as StructureLab | undefined
            const minimum_amount = 20

            if (input_lab_l && (!input_lab_l.mineralType || (ingredients.lhs == input_lab_l.mineralType))) {
              const amount = (this.room.terminal.store[ingredients.lhs] || 0) + input_lab_l.mineralAmount
              if ((amount < minimum_amount)) {
                finished = true
              }
            }
            if (input_lab_r && (!input_lab_r.mineralType || (ingredients.rhs == input_lab_r.mineralType))) {
              const amount = (this.room.terminal.store[ingredients.rhs] || 0) + input_lab_r.mineralAmount
              if ((amount < minimum_amount)) {
                finished = true
              }
            }
          }

          if (finished) {
            Memory.regions[this.name].reaction_outputs!.shift()
          }
          else {
            research_input_targets = [
              {
                id: input_lab_ids.lhs,
                resource_type: ingredients.lhs,
              },
              {
                id: input_lab_ids.rhs,
                resource_type: ingredients.rhs,
              },
            ]

            let labs: StructureLab[] | undefined
            if (this.room.owned_structures) {
              labs = this.room.owned_structures.get(STRUCTURE_LAB) as StructureLab[]
            }

            if (!labs) {
              this.room.owned_structures_not_found_error(STRUCTURE_LAB)
              labs = this.room.find(FIND_MY_STRUCTURES) as StructureLab[]
            }

            research_output_targets = labs.filter((structure) => {
              let input_target_ids = research_input_targets.map(t=>t.id)
              if (structure.structureType != STRUCTURE_LAB) {
                return false
              }
              if (input_target_ids.indexOf(structure.id) >= 0) {
                return false
              }
              if (region_memory.reaction_output_excludes && (region_memory.reaction_output_excludes.indexOf(structure.id) >= 0)) {
                return false
              }
              return true
            }).map((lab) => {
              const target: ResearchTarget = {
                id: lab.id,
                resource_type: output as ResourceConstant,  // this is output
              }
              return target
            })

            // console.log(`${this.name}`)
            // research_input_targets.forEach((a) => {
            //   console.log(`input ${a.id}: ${a.resource_type}`)
            // })

            // research_output_targets.forEach((b) => {
            //   console.log(`output ${b.id}: ${b.resource_type}`)
            // })
          }
        }
        else {
          let reason: string

          if (RESOURCES_ALL.indexOf(output as ResourceConstant) < 0) {
            Memory.regions[this.name].reaction_outputs!.shift()
            reason = ``
          }
          else {
            reason = `Unknown`
          }

          const message = `Region no ingredients found for ${output}, ${this.name}`
          console.log(message)
          Game.notify(message)
        }
      }
      else {
        if ((Game.time % 19) == 3) {
          const message = `No reaction ${this.name}`
          console.log(message)
          // Game.notify(message)
        }
      }
    }

    // --
    this.attacked_rooms = this.room_names.map((room_name) => {
      const room_memory = Memory.rooms[room_name]
      if (room_memory && room_memory.attacked_time) {
        return room_name
      }
      return null
    }).filter((room_name) => {
      return !(!room_name)
    }) as string[]

    const attacked = rooms_need_to_be_defended.map((room_name) => {
      const room_memory = Memory.rooms[room_name]
      if (room_memory && room_memory.attacked_time) {
        return room_name
      }
      return null
    }).filter((room_name) => {
      return !(!room_name)
    }) as string[]

    this.attacked_rooms = this.attacked_rooms.concat(attacked)

    if ((this.attacked_rooms.length > 0) && ((Game.time % 13) == 5)) {
      const message = `Room ${this.attacked_rooms} are attacked!! ${this.name}`
      console.log(message)
      // Game.notify(message)
    }

    // -- Memory --
    let worker_squad: WorkerSquad | null = null
    let upgrader_squad: UpgraderSquad | null = null
    let researcher_squad: ResearcherSquad | null = null
    let raider_squad: RaiderSquad | null = null
    // let temp_squad: TempSquad | null = null
    let invader_squad: InvaderSquad | null = null
    const raid_target: RaiderTarget = {
      id: '59f1c265a5165f24b259a48a',
      lair_id: '59f1a02082100e1594f361b8',
      room_name: 'W46S46',
    }

    for (const squad_name in Memory.squads) {
      const squad_memory = Memory.squads[squad_name]
      if (squad_memory.owner_name != this.name) {
        continue
      }

      ErrorMapper.wrapLoop(() => {
        switch (squad_memory.type) {
          case SquadType.CONTROLLER_KEEPER: {
            const controller_keeper_squad_memory = squad_memory as ControllerKeeperSquadMemory
            const room_name = controller_keeper_squad_memory.room_name

            const squad = new ControllerKeeperSquad(squad_memory.name, room_name, energy_capacity)
            this.squads.set(squad.name, squad)

            const room = Game.rooms[room_name]
            if (room) {
              room.keeper = squad
            }
            break
          }
          case SquadType.WORKER: {
            const delegated = false //this.room.name == 'W44S42'

            const squad = new WorkerSquad(squad_memory.name, this.room.name, delegated)
            worker_squad = squad
            this.squads.set(squad.name, squad)
            break
          }
          case SquadType.UPGRADER: {
            const squad = new UpgraderSquad(squad_memory.name, this.room.name)
            upgrader_squad = squad
            this.squads.set(squad.name, squad)
            break
          }
          case SquadType.CHARGER: {
            if (!charger_position) {
              const message = `Region charger_position for room ${this.room.name} is not provided`
              console.log(message)
              Game.notify(message)
              break
            }

            const link = Game.getObjectById(this.destination_link_id) as StructureLink | undefined
            const support_links: StructureLink[] = this.support_link_ids.map((id) => {
              return Game.getObjectById(id) as StructureLink | undefined
            }).filter((l) => {
              if (!l) {
                return false
              }
              return true
            }) as StructureLink[]

            const squad = new ChargerSquad(squad_memory.name, this.room, link, support_links, charger_position)

            this.squads.set(squad.name, squad)
            break
          }
          case SquadType.RESEARCHER: {
            const squad = new ResearcherSquad(squad_memory.name, this.room.name, research_input_targets, research_output_targets)

            researcher_squad = squad
            this.squads.set(squad.name, squad)
            break
          }
          case SquadType.HARVESTER: {
            const harvester_squad_memory = squad_memory as HarvesterSquadMemory
            const source_info = {
              id: harvester_squad_memory.source_id,
              room_name: harvester_squad_memory.room_name,
            }

            const squad = new HarvesterSquad(squad_memory.name, source_info, harvester_destination, energy_capacity)
            this.squads.set(squad.name, squad)
            break
          }
          case SquadType.REMOET_HARVESTER: {
            const remote_harvester_squad_memory = squad_memory as RemoteHarvesterSquadMemory

            const squad = new RemoteHarvesterSquad(squad_memory.name, this.room, remote_harvester_squad_memory.room_name, Object.keys(remote_harvester_squad_memory.sources), harvester_destination, energy_capacity, this)
            this.squads.set(squad.name, squad)
            break
          }
          case SquadType.REMOET_M_HARVESTER: {
            if (!this.room.storage) {
              console.log(`ERROR!!!3`)
              break
            }

            const squad = new RemoteMineralHarvesterSquad(squad_memory.name, this.room.storage)
            this.squads.set(squad.name, squad)
            break
          }
          case SquadType.REMOTE_DEFENDER: {
            const squad = new RemoteDefenderSqauad(squad_memory.name)
            this.squads.set(squad.name, squad)
            break
          }
          case SquadType.LIGHTWEIGHT_HARVESTER: {
            const harvester_squad_memory = squad_memory as HarvesterSquadMemory
            const source_info = {
              id: harvester_squad_memory.source_id,
              room_name: harvester_squad_memory.room_name,
            }

            const squad = new LightWeightHarvesterSquad(squad_memory.name, source_info, harvester_destination, energy_capacity, this)
            this.squads.set(squad.name, squad)
            break
          }
          case SquadType.MANUAL: {
            const squad = new ManualSquad(squad_memory.name, this.room.name)

            this.manual_squad = squad
            this.squads.set(squad.name, squad)
            break
          }
          case SquadType.SCOUT: {
            const squad = new ScoutSquad(squad_memory.name, rooms_need_scout)

            this.scout_squad = squad
            this.squads.set(squad.name, squad)
            break
          }
          case SquadType.ATTACKER: {
            const squad = new AttackerSquad(squad_memory.name, this.attacked_rooms, this.room, energy_capacity)

            this.defend_squad = squad
            this.squads.set(squad.name, squad)
            break
          }
          case SquadType.RAIDER: {
            const squad = new RaiderSquad(squad_memory.name, raid_target)

            raider_squad = squad
            this.squads.set(squad.name, squad)
            break
          }
          case SquadType.INVADER: {
            const squad = new InvaderSquad(squad_memory.name, this.room.name)

            invader_squad = squad
            this.squads.set(squad.name, squad)
            break
          }
          case SquadType.GUARD: {
            const squad = new GuardSquad(squad_memory.name, this.room.name)

            this.squads.set(squad.name, squad)
            break
          }
          case SquadType.TEMP: {
            if (this.temp_squad_target_room_name) {
              // Creating squad costs CPU
              const temp_squad_target_room = Game.rooms[this.temp_squad_target_room_name]

              if (!temp_squad_target_room || !temp_squad_target_room.controller || !temp_squad_target_room.controller.my) {
                const squad = new TempSquad(squad_memory.name, this.room.name, this.temp_squad_target_room_name)
                this.squads.set(squad.name, squad)
              }
            }
            break
          }
          default:
            console.log(`Unexpected squad type ${squad_memory}`)
            break
          }
        }, `Squad.init ${this.room.name} ${squad_memory.name}`)()
    }

    // --- Room ---
    for (const room_name of this.room_names) {
      let room_memory = Memory.rooms[room_name]

      if (!room_memory) {
        room_memory = {
          harvesting_source_ids: []
        }
        Memory.rooms[room_name] = room_memory
      }

      if (room_memory.keeper_squad_name) {
        continue
      }

      const room = Game.rooms[room_name]

      if (room_name == this.room.name) {
        continue  // Since there's upgrader squad, controller keeper no longer needed
      }

      const name = ControllerKeeperSquad.generateNewName()
      const squad = new ControllerKeeperSquad(name, room_name, energy_capacity)

      if (room) {
        room.keeper = squad
      }

      Memory.rooms[room_name].keeper_squad_name = squad.name
      this.squads.set(squad.name, squad)

      const memory: ControllerKeeperSquadMemory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
        room_name: room_name,
        number_of_creeps: 0,
      }
      Memory.squads[squad.name] = memory

      console.log(`Create roomkeeper for ${room_name}, assigned: ${squad.name}`)
      break // To not create squads with the same name
    }

    // --- Worker ---
    if (!worker_squad) {
      const name = `worker_${this.room.name.toLowerCase()}` //WorkerSquad.generateNewName()
      const squad = new WorkerSquad(name, this.room.name)

      worker_squad = squad
      this.squads.set(squad.name, squad)

      const memory: SquadMemory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
        number_of_creeps: 0,
      }
      Memory.squads[squad.name] = memory

      console.log(`Create worker for ${this.name}, assigned: ${squad.name}`)
    }
    this.worker_squad = worker_squad as WorkerSquad

    // --- Upgrader ---
    if (!upgrader_squad) {
      const name = `upgrader_${this.room.name.toLowerCase()}` //UpgraderSquad.generateNewName()
      const squad = new UpgraderSquad(name, this.room.name)

      upgrader_squad = squad
      this.squads.set(squad.name, squad)

      const memory: SquadMemory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
        number_of_creeps: 0,
      }
      Memory.squads[squad.name] = memory

      console.log(`Create upgrader for ${this.name}, assigned: ${squad.name}`)
    }
    this.upgrader_squad = upgrader_squad!

    if (this.room.keeper) {
      console.log(`Region ${this.name} no longer need controller keeper ${this.room.keeper.name}`)
      delete Memory.squads[this.room.keeper.name]
    }

    // --- Researcher ---
    if (!researcher_squad) {
      const name = `researcher_${this.room.name.toLowerCase()}` //ResearcherSquad.generateNewName()
      const squad = new ResearcherSquad(name, this.room.name, research_input_targets, research_output_targets)

      researcher_squad = squad
      this.squads.set(squad.name, squad)

      const memory: SquadMemory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
        number_of_creeps: 0,
      }
      Memory.squads[squad.name] = memory

      console.log(`Create researcher for ${raid_target}, assigned: ${squad.name}`)
    }

    // --- Harvester ---
    for (const target of harvester_targets) {
      // Initialize
      if (!Memory.rooms[target.room_name]) {
        Memory.rooms[target.room_name] = {
          harvesting_source_ids: []
        }
      }
      if (!Memory.rooms[target.room_name].harvesting_source_ids) {
        Memory.rooms[target.room_name].harvesting_source_ids = []
      }

      // --
      if (Memory.rooms[target.room_name].harvesting_source_ids.indexOf(target.id) >= 0) {
        continue
      }
      Memory.rooms[target.room_name].harvesting_source_ids.push(target.id)

      const name = HarvesterSquad.generateNewName()
      const squad = new HarvesterSquad(name, target, harvester_destination, energy_capacity)

      this.squads.set(squad.name, squad)

      const memory: HarvesterSquadMemory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
        source_id: target.id,
        room_name: target.room_name,
        number_of_creeps: 0,
      }
      Memory.squads[squad.name] = memory

      console.log(`Create harvester for ${target.room_name} ${target.room_name}, assigned: ${squad.name}`)
      break // To not create squads with the same name
    }

    // --- Lightweight Harvester ---
    for (const target of lightweight_harvester_targets) {
      // Initialize
      if (!Memory.rooms[target.room_name]) {
        Memory.rooms[target.room_name] = {
          harvesting_source_ids: []
        }
      }
      if (!Memory.rooms[target.room_name].harvesting_source_ids) {
        Memory.rooms[target.room_name].harvesting_source_ids = []
      }

      // --
      if (Memory.rooms[target.room_name].harvesting_source_ids.indexOf(target.id) >= 0) {
        continue
      }
      Memory.rooms[target.room_name].harvesting_source_ids.push(target.id)

      const name = LightWeightHarvesterSquad.generateNewName()
      const squad = new LightWeightHarvesterSquad(name, target, harvester_destination, energy_capacity, this)

      this.squads.set(squad.name, squad)

      const memory: HarvesterSquadMemory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
        source_id: target.id,
        room_name: target.room_name,
        number_of_creeps: 0,
      }
      Memory.squads[squad.name] = memory

      console.log(`Create lightweight harvester for ${target.room_name} ${target.room_name}, assigned: ${squad.name}`)
      break // To not create squads with the same name
    }

    // --- Scout ---
    if ((!this.scout_squad) && (rooms_need_scout.length > 0)) {
      const name = `scout_${this.room.name.toLowerCase()}` //ScoutSquad.generateNewName()
      const squad = new ScoutSquad(name, rooms_need_scout)

      this.scout_squad = squad
      this.squads.set(squad.name, squad)

      const memory: SquadMemory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
        number_of_creeps: 0,
      }
      Memory.squads[squad.name] = memory

      console.log(`Create scout for ${rooms_need_scout}, assigned: ${squad.name}`)
    }

    // --- Attacker ---
    if (!this.defend_squad) {
      const name = `attacker_${this.room.name.toLowerCase()}` //AttackerSquad.generateNewName()
      const memory: SquadMemory = {
        name: name,
        type: SquadType.ATTACKER,
        owner_name: this.name,
        number_of_creeps: 0,
      }
      Memory.squads[name] = memory

      const squad = new AttackerSquad(name, this.attacked_rooms, this.room, energy_capacity)

      this.defend_squad = squad
      this.squads.set(squad.name, squad)

      console.log(`Create defender for ${this.attacked_rooms}, assigned: ${squad.name}`)
    }

    // --- Raider ---
    if (!raider_squad && (this.room.name == 'W48S47')) {
      const name = RaiderSquad.generateNewName()
      const squad = new RaiderSquad(name, raid_target)

      raider_squad = squad
      this.squads.set(squad.name, squad)

      const memory: SquadMemory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
        number_of_creeps: 0,
      }
      Memory.squads[squad.name] = memory

      console.log(`Create raider for ${raid_target}, assigned: ${squad.name}`)
    }

    // --- Invader ---
    // To not recreate squad when changing squad owner region
    // if (!invader_squad && (this.room.name == 'W44S42')) {
    //   const name = InvaderSquad.generateNewName()
    //   const squad = new InvaderSquad(name, this.room.name, invade_target)

    //   invader_squad = squad
    //   this.squads.set(squad.name, squad)

    //   const memory: SquadMemory = {
    //     name: squad.name,
    //     type: squad.type,
    //     owner_name: this.name,
    //   }
    //   Memory.squads[squad.name] = memory

    //   console.log(`Create invader for ${invade_target}, assigned: ${squad.name}`)
    // }

    // Manual
    if (!this.manual_squad) {
      // const name = ManualSquad.generateNewName()
      const name = `manual_${this.room.name.toLowerCase()}`
      const squad = new ManualSquad(name, this.room.name)

      this.manual_squad = squad
      this.squads.set(squad.name, squad)

      const memory: SquadMemory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
        number_of_creeps: 0,
      }
      Memory.squads[squad.name] = memory
    }

    // // Temp
    // if (!temp_squad) {
    //   // const name = TempSquad.generateNewName()
    //   const name = `temp${this.room.name.toLowerCase()}`
    //   const squad = new TempSquad(name, this.room.name, energy_capacity)

    //   temp_squad = squad
    //   this.squads.set(squad.name, squad)

    //   const memory: SquadMemory = {
    //     name: squad.name,
    //     type: squad.type,
    //     owner_name: this.name,
    //     number_of_creeps: 0,
    //   }
    //   Memory.squads[squad.name] = memory
    // }

    // --- Spawn ---
    const sorted = Array.from(this.squads.values()).sort(function(lhs, rhs) {
      const l_priority = lhs.spawnPriority
      const r_priority = rhs.spawnPriority
      if (l_priority < r_priority) return -1
      else if (l_priority > r_priority) return 1
      else return 0
    })

    const highest_priority = sorted[0].spawnPriority
    const availableEnergy = this.room.energyAvailable
    const worker_squad_name = this.worker_squad.name

    this.squads_need_spawn = highest_priority == SpawnPriority.NONE ? [] : sorted.filter((squad) => {
      const is_lightweight_harvester = squad.type == SquadType.LIGHTWEIGHT_HARVESTER
      const worker_harvester = Array.from(this.worker_squad.creeps.values()).filter((creep) => {
        return (creep.memory.type == CreepType.HARVESTER)
          && (creep.memory.squad_name == worker_squad_name)
          && ((creep.ticksToLive || 0) > 300)
      }
      )[0]
      const number_of_workers = this.worker_squad.creeps.size

      if (is_lightweight_harvester && worker_harvester && (number_of_workers > 4) && (squad.creeps.size == 0)) {
        const room = Game.rooms[(squad as LightWeightHarvesterSquad).source_info.room_name]
        if (room && !room.attacked) {
          worker_harvester.memory.squad_name = squad.name
          worker_harvester.memory.status = CreepStatus.CHARGE
          // console.log(`Creep ${worker_harvester.name} is assigned to ${squad.name}, from ${this.worker_squad.name} ${this.name}`)
          return false
        }
      }

      return (squad.spawnPriority == highest_priority)
    })

    // --- Defend ---
    // Tower
    if (this.room.owned_structures) {
      this.towers = this.room.owned_structures.get(STRUCTURE_TOWER) as StructureTower[]
    }

    if (!this.towers || (this.towers.length == 0)) {
      if (this.room.controller && (this.room.controller.level >= 3)) {
        this.room.owned_structures_not_found_error(STRUCTURE_TOWER)
      }

      this.towers = this.room.find(FIND_MY_STRUCTURES, {
        filter: (structure) => {
          return structure.structureType == STRUCTURE_TOWER
        }
      }) as StructureTower[]
    }

    // const is_safemode_active = (this.room && this.room.controller) ? ((this.room!.controller!.safeMode || 0) > 0) : false

    const damaged_hostiles: Creep[] = this.room.attacker_info.hostile_creeps.filter((creep) => {
      return (creep.hits < creep.hitsMax)
    })

    const damaged_healers: Creep[] = damaged_hostiles.filter((creep) => {
      return creep.getActiveBodyparts(HEAL) > 0
    })

    const damaged_my_creeps: Creep[] = this.room.find(FIND_MY_CREEPS, {
      filter: (creep) => {
        return (creep.hits < creep.hitsMax)
      }
    })

    const heavyry_damaged_ramparts: (StructureRampart | StructureWall)[] = this.room.find(FIND_STRUCTURES, { // To Detect non-ownable structures
      filter: (structure) => {
        if (structure.structureType == STRUCTURE_RAMPART) {
          return structure.hits < 1000
        }
        if (structure.structureType == STRUCTURE_WALL) {
          return structure.hits < 1000
        }
        return false
      }
    }) as (StructureRampart | StructureWall)[]

    let hits_max = 150000
    if (this.room.storage && (this.room.storage.store.energy > 700000)) {
      hits_max = 500000
    }
    else if (this.room.storage && (this.room.storage.store.energy > 500000)) {
      hits_max = 400000
    }
    else if (this.room.storage && (this.room.storage.store.energy > 400000)) {
      hits_max = 300000
    }

    if ((this.room.name == 'W51S29') && !this.room.heavyly_attacked) {
      hits_max = 1500000
    }
    else if ((this.room.name == 'W44S7')) {
      hits_max = 300000
    }
    else if ((this.room.name == 'W38S7')) {
      hits_max = 100000
    }

    const damaged_structures: AnyStructure[] = this.room.find(FIND_STRUCTURES, { // To Detect non-ownable structures
      filter: (structure) => {
        if (this.room.name == 'W48N11') {
          if ((structure.pos.x <= 3)) {
            return false
          }
          if ((structure.pos.x >= 47)) {
            return false
          }
          if ((structure.pos.y <= 3)) {
            return false
          }
          if ((structure.pos.y >= 47)) {
            return false
          }
        }

        const is_wall = (structure.structureType == STRUCTURE_WALL) || (structure.structureType == STRUCTURE_RAMPART)
        const max = is_wall ? hits_max : (structure.hitsMax * 0.7)
        return (structure.hits < Math.min(structure.hitsMax, max))
      }
    })

    const should_attack_hostile = this.room.attacked && ((this.room.attacker_info.heal <= 25) || (this.room.attacker_info.hostile_teams.indexOf('Invader') >= 0) || (this.room.attacker_info.hostile_creeps.length < 3))

    this.towers.forEach((tower) => {

      if (should_attack_hostile) {
        if(damaged_healers.length > 0) {
          const hostile = tower.pos.findClosestByRange(damaged_healers)
          if (hostile) {
            tower.attack(hostile)
            return
          }
          else {
            console.log(`Region ${this.name} unexpected error: damaged healer not found ${damaged_healers}.`)
          }
        }
        else if (damaged_hostiles.length > 0) {
          const hostile = tower.pos.findClosestByRange(damaged_hostiles)
          if (hostile) {
            tower.attack(hostile)
            return
          }
          else {
            console.log(`Region ${this.name} unexpected error: damaged hostile not found ${damaged_hostiles}.`)
          }
        }
        else {
          const hostile = tower.pos.findClosestByRange(this.room.attacker_info.hostile_creeps)
          if (hostile) {
            tower.attack(hostile)
            return
          }
          else {
            console.log(`Region ${this.name} unexpected error: hostile not found ${this.room.attacked}, ${this.room.attacker_info.hostile_creeps}.`)
          }
        }
      }

      if (damaged_my_creeps.length > 0) {
        const damaged_creep = tower.pos.findClosestByRange(damaged_my_creeps)
        if (damaged_creep) {
          tower.heal(damaged_creep)
          return
        }
        else {
          console.log(`Region ${this.name} unexpected error: damaged_creep not found ${damaged_my_creeps}.`)
        }
      }

      if ((tower.energy < (tower.energyCapacity * 0.66))) {
        return
      }

      if (heavyry_damaged_ramparts.length > 0) {
        const rampart = tower.pos.findClosestByRange(heavyry_damaged_ramparts)
        if (rampart) {
          tower.repair(rampart)
          return
        }
        else {
          console.log(`Region ${this.name} unexpected error: damaged rampart not found ${heavyry_damaged_ramparts}.`)
        }
      }

      if (damaged_structures.length > 0) {
        const structure = tower.pos.findClosestByRange(damaged_structures)
        if (structure) {
          tower.repair(structure)
          return
        }
        else {
          console.log(`Region ${this.name} unexpected error: damaged structure not found ${damaged_structures}.`)
        }
      }
    })

    if ((research_input_targets.length == 2) && (research_output_targets.length > 0)) {
      const input_lab1 = Game.getObjectById(research_input_targets[0].id) as StructureLab
      const input_lab2 = Game.getObjectById(research_input_targets[1].id) as StructureLab

      if ((input_lab1.mineralType == research_input_targets[0].resource_type) && (input_lab2.mineralType == research_input_targets[1].resource_type)) {
        research_output_targets.forEach((target) => {
          const output_lab = Game.getObjectById(target.id) as StructureLab
          const reaction_result = output_lab.runReaction(input_lab1, input_lab2)

          switch(reaction_result) {
            case OK:
            case ERR_NOT_ENOUGH_RESOURCES:
            case ERR_FULL:
            case ERR_TIRED:
              break

            default:
              if ((Game.time % 23) == 11) {
                console.log(`Lab.runReaction failed with ${reaction_result}, ${this.name}, ${output_lab.pos}`)
              }
              break
          }
        })
      }
    }
  }

  public say(message: string): void {
    this.squads.forEach((squad, _) => {
      squad.say(message)
    })
  }

  public run(): void {
    if ((Game.time % 101) == 13) {
      ErrorMapper.wrapLoop(() => {
        this.watchDog()
      }, `${this.name}.watchDog`)()
    }

    ErrorMapper.wrapLoop(() => {
      this.activateSafeModeIfNeeded()
    }, `${this.name}.activateSafeModeIfNeeded`)()

    ErrorMapper.wrapLoop(() => {
      this.drawDebugInfo()
    }, `${this.name}.drawDebugInfo`)()

    const sources = this.room.sources
    this.squads.forEach((squad, _) => {
      ErrorMapper.wrapLoop(() => {
        squad.run()
      }, `${squad.name}.run ${squad.description()}`)()
    })

    ErrorMapper.wrapLoop(() => {
      this.transferLinks()
    }, `${this.name}.transferLinks`)()

    ErrorMapper.wrapLoop(() => {
      this.spawnAndRenew()
    }, `${this.name}.spawnAndRenew`)()

    ErrorMapper.wrapLoop(() => {
      const nuke: Nuke = this.room.find(FIND_NUKES, {
        filter: (nuke) => {
          return (nuke.timeToLand < 100)
        }
      })[0]

      if (nuke) {
        let creeps: Creep[] = []

        this.squads.forEach((squad) => {
          const c = Array.from(squad.creeps.values()).filter((cc) => {
            return cc.room.name == this.room.name
          })
          creeps = creeps.concat(c)
        })

        let room_name: string

        switch (this.room.name) {
          case 'W48S47':
            room_name = 'W48S48'
            break

          default:
            room_name = 'W48S48'  // better than nothing
            break
        }

        creeps.forEach((c) => {
          if (c.moveToRoom(room_name) == ActionResult.IN_PROGRESS) {
            return
          }
          c.moveTo(26, 11)
        })
      }
    }, `${this.name}.findNuke`)()

    ErrorMapper.wrapLoop(() => {
      let power_spawns: StructurePowerSpawn[] | undefined

      if (this.room.owned_structures) {
        power_spawns = this.room.owned_structures.get(STRUCTURE_POWER_SPAWN) as StructurePowerSpawn[]
      }

      // if (!power_spawns) {
      //   this.room.owned_structures_not_found_error(STRUCTURE_POWER_SPAWN)

      //   power_spawns = this.room.find(FIND_STRUCTURES, {
      //     filter: (structure) => {
      //       return structure.structureType == STRUCTURE_POWER_SPAWN
      //     }
      //   }) as StructurePowerSpawn[]
      // }

      if (power_spawns) {
        power_spawns.forEach((power_spawn) => {
          power_spawn.processPower()
        })
      }
    }, `${this.name}.processPower`)()

    if ((Game.time % 31) == 0) {
      ErrorMapper.wrapLoop(() => {
        this.placeConstructionSite()
      }, `${this.name}.placeConstructionSite`)()
    }

    const test_send_resources = Memory.debug.test_send_resources
    if (test_send_resources || ((Game.time % 97) == 1)) {
      ErrorMapper.wrapLoop(() => {
        this.sendResources()
      })()
    }

    // ErrorMapper.wrapLoop(() => {
    //   if ((this.room.name == 'W48S47') || (this.room.name == 'W49S47') || (this.room.name == 'S49S48')) {
    //     this.room.find(FIND_STRUCTURES).forEach((s) => {
    //       s.notifyWhenAttacked(false)
    //     })
    //   }
    // })()
  }

  // --- Private ---
  private sendResources(): void {
    if (!this.room.terminal) {
      console.log(`Region.sendResources no terminal ${this.name} ${this.room.terminal}`)
      return
    }
    if (this.room.terminal.cooldown > 0) {
      return
    }

    const region_memory = Memory.regions[this.name]
    if (!region_memory || !region_memory.resource_transports) {
      return
    }

    const raw_resources: ResourceConstant[] = [
      RESOURCE_OXYGEN,
      RESOURCE_HYDROGEN,
      RESOURCE_UTRIUM,
      RESOURCE_LEMERGIUM,
      RESOURCE_ZYNTHIUM,
      RESOURCE_KEANIUM,
      RESOURCE_CATALYST,
    ]

    for (const room_name in region_memory.resource_transports) {
      const resource_types = region_memory.resource_transports[room_name]
      if (!resource_types) {
        continue
      }

      for (const resource_type of resource_types) {
        if (RESOURCES_ALL.indexOf(resource_type) < 0) {
          console.log(`Region.sendResources wrong arguments ${resource_type} ${this.name}`)
          continue
        }

        const to_room = Game.rooms[room_name]
        if (!to_room || !to_room.terminal) {
          console.log(`Region.sendResources no destination room ${room_name}, ${this.room.name}`)
          continue
        }

        if (resource_type == RESOURCE_ENERGY) {
          if (!this.room.storage || (this.room.storage.store.energy < 400000)) {
            console.log(`Region.sendResources lack of energy ${this.room.name}`)
            continue
          }
        }

        const capacity = (resource_type == RESOURCE_ENERGY) ? 100000 : 10000

        if (to_room && (!to_room.terminal || ((_.sum(to_room.terminal.store) > (to_room.terminal.storeCapacity - capacity))))) {
          const message = `Terminal ${to_room.name} is full ${this.room.name} ${resource_type}`
          console.log(message)

          if (resource_type != RESOURCE_ENERGY) {
            Game.notify(message)
          }
          continue
        }

        if (to_room && (!to_room.storage || ((_.sum(to_room.storage.store) > (to_room.storage.storeCapacity - (capacity * 3)))))) {
          const message = `Storage ${to_room.name} is full ${this.room.name} ${resource_type}`
          console.log(message)

          if (resource_type != RESOURCE_ENERGY) {
            Game.notify(message)
          }
          continue
        }

        const is_raw_resource = (raw_resources.indexOf(resource_type) >= 0)
        let amount_needed = is_raw_resource ? 4900 : 500
        let resource_capacity = 3000
        let amount_send: number = is_raw_resource ? 2000 : Math.min((this.room.terminal.store[resource_type] || 0), 5000)

        if (resource_type == RESOURCE_ENERGY) {
          amount_needed = 140000
          resource_capacity = 160000
          amount_send = 100000
        }

        const from_room_ready: boolean = ((this.room.terminal.store[resource_type] || 0) > amount_needed)
        const to_room_ready: boolean = ((to_room.terminal.store[resource_type] || 0) < resource_capacity)

        if (from_room_ready && to_room_ready) {
          const result = this.room.terminal.send(resource_type, amount_send, room_name)
          console.log(`Send ${resource_type} from ${this.room.name} to ${room_name}, result:${result}`)

          if (result == OK) {
            break
          }
        }
      }
    }
  }

  private placeConstructionSite() {
    for (const flag_name in Game.flags) {
      const flag = Game.flags[flag_name]
      if (!flag.room) {
        continue
      }
      if ((flag.room.name != this.room.name)) {
        continue
      }
      if (this.room.spawns.length == 0) {
        continue
      }
      if (this.room.construction_sites && (this.room.construction_sites.length > 0)) {
        continue
      }

      let structure_type: StructureConstant | undefined

      switch (flag.color) {
        case COLOR_RED:
          structure_type = STRUCTURE_TOWER
          break

        case COLOR_BLUE:
          structure_type = STRUCTURE_LAB
          break

        case COLOR_GREEN:
          structure_type = STRUCTURE_STORAGE
          break

        case COLOR_PURPLE:
          structure_type = STRUCTURE_TERMINAL
          break

        case COLOR_YELLOW:
          structure_type = STRUCTURE_EXTRACTOR
          break

        case COLOR_GREY:
          structure_type = STRUCTURE_SPAWN
          break
      }

      if (!structure_type) {
        structure_type = STRUCTURE_EXTENSION
      }

      const result = this.room.createConstructionSite(flag.pos, structure_type)

      if (result == OK) {
        console.log(`Place ${structure_type} construction site on ${flag.name}, ${flag.pos}, ${flag.color}`)
        flag.remove()

        break // If deal with all flags once, createConstructionSite() succeeds each call but when it actually runs (that is the end of the tick) it fails
        // so call it one by one
      }
      else if (result != ERR_RCL_NOT_ENOUGH) {
        console.log(`ERROR Place ${structure_type} construction site failed E${result}: ${flag.name}, ${flag.pos}, ${flag.color}`)
      }
    }
  }

  private activateSafeModeIfNeeded() {
    if (this.room.name == 'W49S34') {
      return
    }
    if (this.room.name == 'W46S33') {
      return
    }
    if (this.room.name == 'W48S47') {
      return
    }
    if (this.room.name == 'W49S47') {
      return
    }
    if (this.room.name == 'W49S48') {
      return
    }
    // if (this.room.controller && (this.room.controller.level < 4)) {
    if (this.room.controller) {
      if (this.room.name == 'W48S12') {
        // activate safemode if needed
      }
      else {
        return
      }
    }
    if (this.room.spawns.length == 0) {
      return
    }
    // if (this.room.name != 'W49S34') {
    //   const w49s34 = Game.rooms['W49S34']

    //   if (w49s34 && w49s34.controller && w49s34.controller.my && ((w49s34.controller.safeModeCooldown || 0) < 20000)) {
    //     return
    //   }
    // }

    // Safe mode
    // @todo: this codes should be located on somewhere like Empire
    if (Game.time % 2 == 0) {
      return
    }

    const room = this.room
    if (!room.controller || !room.controller.my) {
      console.log(`Region.activateSafeModeIfNeeded it's not my controller ${room.controller} ${this.name}`)
      return
    }

    // if (room.controller.level < 5) {
    //   return
    // }

    const is_safemode_active = (room.controller.safeMode || 0) > 0
    if (is_safemode_active) {
      return
    }

    // If there's no healer, towers and attackers can deal with it
    if (this.room.attacker_info.heal == 0) {
      return
    }
    console.log('DETECT ', ' Healer-Attackers!!!')

    const important_structures: StructureConstant[] = [
      STRUCTURE_SPAWN,
      STRUCTURE_STORAGE,
      STRUCTURE_TERMINAL,
      STRUCTURE_LAB,
      STRUCTURE_OBSERVER,
      STRUCTURE_POWER_SPAWN,
      STRUCTURE_NUKER,
      STRUCTURE_EXTENSION,
      STRUCTURE_TOWER,
    ]

    const damaged_structures = room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return (important_structures.indexOf(structure.structureType) >= 0)
          && (structure.hits < (structure.hitsMax - 100))
      }
    })
    if (damaged_structures.length > 0) {
      const message = `Activate safe mode at ${room.name} : ${room.controller.activateSafeMode()}, damaged structures: ${damaged_structures}`
      console.log(message)
      Game.notify(message)
      return
    }

    const damaged_my_creeps = room.find(FIND_MY_CREEPS, {
      filter: (creep) => {
        return creep.hits < creep.hitsMax
      }
    })

    const number_of_creeps = room.find(FIND_MY_CREEPS).length
    if ((number_of_creeps < 5) && (damaged_my_creeps.length > 1) && (this.worker_squad.creeps.size < 2)) {
      const message = `Activate safe mode at ${room.name} : ${room.controller.activateSafeMode()}, number of creeps: ${number_of_creeps}`
      console.log(message)
      Game.notify(message)
      return
    }
  }

  private transferLinks() {
    if (!this.destination_link_id) {
      // console.log(`NO destination_link_id ${this.room.name}`)
      return
    }

    let destination_link = Game.getObjectById(this.destination_link_id) as StructureLink | undefined
    let support_link = this.support_link_ids.map((id) => {
      return Game.getObjectById(id) as StructureLink | undefined
    }).filter((l) => {
      if (!l) {
        const message = `Region.transferLinks incorrect support_link_id ${this.support_link_ids} ${this.name}`
        console.log(message)
        if ((Game.time % 29) == 11) {
          Game.notify(message)
        }
        return false
      }
      if (l.energy > (l.energyCapacity * 0.5)) {
        return false
      }
      return true
    })[0]

    const destination = support_link || destination_link
    if (!destination) {
      console.log(`Region.transferLinks no destination found ${this.name} for ${this.destination_link_id}`)
      return
    }

    if (destination.room.name != this.room.name) {
      const message = `Region.transferLinks the specified link is not in the room ${destination.pos}, ${this.room}`
      console.log(message)
      Game.notify(message)
      return
    }

    let links: StructureLink[] | undefined

    if (this.room.owned_structures) {
      links = this.room.owned_structures.get(STRUCTURE_LINK) as StructureLink[]
    }

    if (!links || (links.length == 0)) {
      this.room.owned_structures_not_found_error(STRUCTURE_LINK)

      links = this.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (structure.structureType == STRUCTURE_LINK)
        }
      }) as StructureLink[]
    }

    if (!links || (links.length == 0)) {
      console.log(`Region.transferLinks no link error ${this.room.name}`)
      return
    }

    const source_links = links.filter((link) => {
      if (link.id == this.destination_link_id) {
        return false
      }
      if (this.support_link_ids.indexOf(link.id) >= 0) {
        return false
      }
      if (link.energy == 0) {
        return false
      }
      if (link.cooldown > 0) {
        return false
      }
      if ((destination.energyCapacity - destination.energy) > link.energy) {
        return true
      }
      if ((link.energy > (link.energyCapacity / 2))) {
        return true
      }
      if (link.energy == link.energyCapacity) {
        return true
      }
      return false
    })

    let transfer_succeeded = false

    for (const link of source_links) {
      if (link.transferEnergy(destination) == OK) {
        transfer_succeeded = true
        break  // To not consume all link's cooldown time at once
      }
    }

    if (!transfer_succeeded) {
      if (destination_link && support_link && (destination_link.energy > 200) && (support_link.energy < (support_link.energyCapacity * 0.5))) {
        destination_link.transferEnergy(support_link)
      }
    }
  }

  private spawnAndRenew(): void {
    const no_remote_harvester = (this.room.name == 'W47N5') && this.room.controller && (this.room.controller.level < 7)

    if (no_remote_harvester && ((Game.time % 97) == 3)) {
      console.log(`\n\nNO REMOTE HARVESTER ${this.name}\n\n`)
    }

    const availableEnergy = this.room.energyAvailable
    const energy_capacity = this.room.energyCapacityAvailable - 50

    let squad_needs_spawn = this.delegated_squads.concat(this.squads_need_spawn)
    squad_needs_spawn = squad_needs_spawn.filter((squad) => {
      if (no_remote_harvester && ([SquadType.REMOET_HARVESTER].indexOf(squad.type) >= 0)) {
        return false
      }
      return (squad.hasEnoughEnergy(availableEnergy, energy_capacity))
    })

    const urgent = (squad_needs_spawn.length > 0) ? squad_needs_spawn[0].spawnPriority == SpawnPriority.URGENT : false

    Array.from(this.spawns.values()).filter((spawn) => {
      if (spawn.spawning) {
        return false
      }
      if (urgent) {
        return true
      }
      return spawn.renewSurroundingCreeps() == ActionResult.DONE
    }).forEach((spawn) => {
      const squad = squad_needs_spawn.pop()

      if (squad) {
        squad.addCreep(availableEnergy, (body, name, ops) => { // this closure is to keep 'this'
          const result = spawn.spawnCreep(body, name, ops)
          if (result == OK) {
            Memory.regions[this.name].last_spawn_time = Game.time
          }
          else {
            console.log(`${spawn.name} in ${this.name} [${body}] and assign to ${squad.name}: ${result}, energy: ${this.room.energyAvailable}`)
          }
          return result
        })
      }
    })
  }

  private watchDog(): void {
    const region_memory = Memory.regions[this.name]
    let error: string | undefined

    if (!region_memory) {
      error = `No region_memory`
    }
    else {
      if (!this.room.controller || (this.room.controller.level < 5)) {
        return
      }

      let duration = 400
      if (this.room.name == 'W51S29') {
        duration = 600
      }

      if (!region_memory.last_spawn_time) {
        error = `No last_spawn_time`
      }
      else if ((Game.time - region_memory.last_spawn_time) > duration) {
        error = `No spawn in ${(Game.time - region_memory.last_spawn_time)} ticks (last_spawn_time: ${region_memory.last_spawn_time})`
      }
    }

    if (!error) {
      return
    }

    const message = `[ERROR] Region ${this.name} ${error}`
    console.log(message)
    Game.notify(message)
  }

  private drawDebugInfo(): void { // @todo: Show debug info for each rooms
    if (!Memory.debug.show_visuals) {
      return
    }

    const region_memory = Memory.regions[this.name] as RegionMemory
    const room_memory = Memory.rooms[this.room.name]

    let pos: {x: number, y: number} = {x: 1, y: 1}

    switch(this.room.name) {

      case 'W49S19':
        pos = {x: 27, y: 24}
        break

      case 'W44S7':
        pos = {x: 25, y: 1}
        break

      case 'W43S5':
        pos = {x: 25, y: 25}
        break

      case 'W47N2':
        pos = {x: 1, y: 26}
        break

      case 'W43N5':
        pos = {x: 2, y: 28}
        break

      case 'W42N1':
        pos = {x: 28, y: 1}
        break

      default:
        break
    }

    if (room_memory && room_memory.description_position) {
      pos = room_memory.description_position
    }

    let lines: string[] = [
      `${this.name} in ${this.room.name}`,
      `  Rooms: ${this.room_names}, Capacity: ${this.room.energyCapacityAvailable}, Reaction: ${region_memory.reaction_outputs}`,
      `  Squads: ${this.squads.size}, Creeps: ${_.sum(Array.from(this.squads.values()).map(s=>s.creeps.size))}`,
    ]

    const squad_descriptions = this.squadDescriptions(Array.from(this.squads.values()))
    lines = lines.concat(squad_descriptions)

    if (!this.temp_squad_target_room_name) {
      lines.push(`  - no temp squad`)
    }

    if (this.delegated_squads.length > 0) {
      lines.push(`  Delegated: `)
      const delegated_descriptions = this.squadDescriptions(this.delegated_squads)
      lines = lines.concat(delegated_descriptions)
    }

    this.room.visual.multipleLinedText(lines, pos.x, pos.y, {
      align: 'left',
      opacity: 0.8,
      font: '12px',
    })
  }

  private squadDescriptions(squads: Squad[]): string[] {
    return squads.sort((lhs, rhs) => {
      return (lhs.name > rhs.name) ? 1 : -1
    }).map((squad) => {
      return `  - ${squad.description()}`
    }).join('\n').split('\n')
  }
}
