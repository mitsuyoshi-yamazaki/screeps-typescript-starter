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
  worker_squad: WorkerSquad
  private upgrader_squad: UpgraderSquad
  private manual_squad: ManualSquad | undefined
  private scout_squad: ScoutSquad | undefined
  private defend_squad: AttackerSquad | undefined
  private room_names: string[] = []
  private towers: StructureTower[] = []
  private spawns = new Map<string, StructureSpawn>()
  private attacked_rooms: Room[] = []

  constructor(readonly controller: StructureController) {
    if (!controller || !controller.my) {
      const message = `Region() controller not provided or not mine ${controller}`
      console.log(message)
      Game.notify(message)

      // dummy
      this.worker_squad = new WorkerSquad('', '')
      this.upgrader_squad = new UpgraderSquad('', this.room.name, [])
      return
    }

    // Spawns
    this.room.find(FIND_MY_SPAWNS).forEach((spawn) => {
      this.spawns.set(spawn.name, spawn)
    })

    this.spawns.forEach((spawn, _) => {
      spawn.initialize()
    })

    // --- Initialize variables ---
    const storage = this.room.storage
    const terminal = this.room.terminal
    // const spawn = this.room.spawns[0]

    // const container = this.room.find(FIND_STRUCTURES, {
    //   filter: structure => {
    //     return (structure.structureType == STRUCTURE_CONTAINER)
    //   }
    // })[0] as StructureContainer

    let harvester_targets: {id: string, room_name: string}[] = []
    let harvester_destination: StructureStorage | StructureTerminal | StructureContainer | StructureSpawn = (storage || terminal) as (StructureStorage | StructureTerminal) // @fixme: null check // || container
    let lightweight_harvester_targets: {id: string, room_name: string}[] = []
    let rooms_need_scout: string[] = []
    let rooms_need_to_be_defended: string[] = []
    let upgrader_source_ids: string[] = []
    let research_input_targets: ResearchTarget[] = []
    let research_output_targets: ResearchTarget[] = []
    const energy_capacity = this.room.energyCapacityAvailable - 50

    switch (this.room.name) {
      case 'E13S19':  // @fixme: it's in wc server, check Game.shard.name
        lightweight_harvester_targets = [
          { id: '5afd5faef071b00013361e1f', room_name: 'E13S18' },
          { id: '5afd5faef071b00013361eae', room_name: 'E14S19' },
          { id: '5afd5faef071b00013361ead', room_name: 'E14S19' }
        ]
        this.room_names = [this.room.name]//, 'E12S19']
        break

      case 'W1N8':  // @fixme: it's in private server
        break

      case 'W48S47':
        harvester_targets = [
          { id: '59f19fff82100e1594f35e06', room_name: 'W48S47' },  // home top right
          { id: '59f19fff82100e1594f35e08', room_name: 'W48S47' },  // home center
          { id: '59f1c0ce7d0b3d79de5f024d', room_name: 'W48S47' },  // home oxygen
          // { id: '59f1a00e82100e1594f35f82', room_name: 'W47S47' },  // right
          { id: '59f19fff82100e1594f35e0a', room_name: 'W48S48' },  // bottom
          // { id: '59f1a00e82100e1594f35f80', room_name: 'W47S46' },  // top right
          // { id: '59f1a00e82100e1594f35f85', room_name: 'W47S48' },  // bottom right
          // { id: '59f1a00e82100e1594f35f87', room_name: 'W47S48' },  // bottom right
          { id: '59f19fff82100e1594f35e0e', room_name: 'W48S49' },  // bottom
          { id: '59f1a00e82100e1594f35f89', room_name: 'W47S49' },  // bottom
        ]
        lightweight_harvester_targets = [
          { id: '59f1a00e82100e1594f35f82', room_name: 'W47S47' },  // right
          { id: '59f1a00e82100e1594f35f80', room_name: 'W47S46' },  // top right
          { id: '59f1a00e82100e1594f35f85', room_name: 'W47S48' },  // bottom right
          { id: '59f1a00e82100e1594f35f87', room_name: 'W47S48' },  // bottom right
        ]
        rooms_need_to_be_defended = ['W48S49', 'W47S49', 'W47S47', 'W47S46', 'W47S48']
        this.room_names = [this.room.name, 'W48S48', 'W48S49', 'W47S49']//, 'W47S47', 'W47S46', 'W47S48']
        rooms_need_scout = ['W47S47', 'W47S46', 'W46S46', 'W47S48']
        upgrader_source_ids = ['5aec04e52a35133912c2cb1b', '5af5c771dea4db08d5fb7c84']  // storage, link
        research_input_targets = [
          {
            id: '5afb75051c04254c89283685', // 40, 11
            resource_type: RESOURCE_OXYGEN,
          },
          {
            id: '5af483456449d07df7f76acc', // 41, 12
            resource_type: RESOURCE_HYDROGEN,
          },
        ]
        research_output_targets = [
          {
            id: '5afb5a00c41b880caa6c3058', // 41, 11
            resource_type: RESOURCE_HYDROXIDE,
          },
          {
            id: '5af458a11ad10d5415bba8f2', // 40, 12
            resource_type: RESOURCE_HYDROXIDE,
          },
          {
            id: '5afb586ccae66639b23225e1', // 39, 12
            resource_type: RESOURCE_HYDROXIDE,
          },
          {
            id: '5af48c6802a75a3c68294d43', // 40, 13
            resource_type: RESOURCE_HYDROXIDE,
          },
        ]
        break

      case 'W49S47':
        harvester_targets = [
          { id: '59f19ff082100e1594f35c84', room_name: 'W49S47' },  // home, right
          { id: '59f19ff082100e1594f35c83', room_name: 'W49S47' },  // home, top left
          { id: '59f1c0ce7d0b3d79de5f01e1', room_name: 'W49S47' },  // home, utrium
          // { id: '59f19ff082100e1594f35c80', room_name: 'W49S46' },  // top
          // { id: '59f19fff82100e1594f35e04', room_name: 'W48S46' },  // top right
          { id: '59f19ff082100e1594f35c88', room_name: 'W49S48' },  // bottom, center
        ]
        lightweight_harvester_targets = [
          { id: '59f19ff082100e1594f35c80', room_name: 'W49S46' },  // top
          { id: '59f19fff82100e1594f35e04', room_name: 'W48S46' },  // top right
          { id: '59f19ff082100e1594f35c7e', room_name: 'W49S45' },  // top top
        ]
        rooms_need_to_be_defended = ['W49S46', 'W48S46', 'W49S45']
        this.room_names = [this.room.name, 'W49S48'] //, 'W49S48']//, 'W49S46', 'W48S46']
        rooms_need_scout = ['W49S46', 'W48S46', 'W47S45', 'W49S45']
        upgrader_source_ids = ['5aef62f86627413133777bdf']
        research_input_targets = [
          {
            id: '5af7a48ae0c61608e7636bfe', // 33, 22
            resource_type: RESOURCE_OXYGEN,
          },
          {
            id: '5af7c1dcd9566308c315f47f', // 32, 22
            resource_type: RESOURCE_HYDROGEN,
          },
        ]
        research_output_targets = [
          {
            id: '5af7c69c2d04d70cc3c4775a', // 32, 23
            resource_type: RESOURCE_HYDROXIDE,
          }
        ]
        break

      case 'W44S42': {
        harvester_targets = [
          { id: '59f1a03c82100e1594f36609', room_name: 'W44S42' },  // home right
          { id: '59f1a03c82100e1594f36608', room_name: 'W44S42' },  // home left
          { id: '59f1c0cf7d0b3d79de5f0392', room_name: 'W44S42' },  // home hydrogen
        ]
        lightweight_harvester_targets = [
          // // { id: '59f1a03c82100e1594f3660c', room_name: 'W44S43' },  // bottom, top
          // // { id: '59f1a03c82100e1594f3660e', room_name: 'W44S43' },  // bottom, center
          // // // { id: '59f1a01f82100e1594f361a4', room_name: 'W46S43' },  // bottom left
          // { id: '59f1a02e82100e1594f363c5', room_name: 'W45S41' },  // bottom
          // { id: '59f1a02e82100e1594f363c4', room_name: 'W45S41' },  // left
          // { id: '59f1a02e82100e1594f363c7', room_name: 'W45S42' },  // left
          // { id: '59f1a02e82100e1594f363cb', room_name: 'W45S43' },  // left down
          // { id: '59f1a04a82100e1594f367af', room_name: 'W43S42' },  // right
        ]
        rooms_need_to_be_defended = []//['W45S41', 'W45S42', 'W45S43', 'W43S42']
        this.room_names = [this.room.name]
        rooms_need_scout = []//['W45S43', 'W45S42', 'W45S41', 'W44S41', 'W43S42']
        upgrader_source_ids = ['5aefe21eaade48390c7da59c']
        research_input_targets = [
          {
            id: '5af7c5180ce89a3235fd46d8', // 17, 25
            resource_type: RESOURCE_OXYGEN,
          },
          {
            id: '5af7db5db44f464c8ea3a7f5', // 16, 25
            resource_type: RESOURCE_HYDROGEN,
          },
        ]
        research_output_targets = [
          {
            id: '5af804e78f5981321726fefa', // 16, 26
            resource_type: RESOURCE_HYDROXIDE,
          }
        ]
        break
      }
      case 'W48S39':
        harvester_targets = [
          { id: '59f19fff82100e1594f35ded', room_name: 'W48S39' },  // home bottom
          { id: '59f19fff82100e1594f35dec', room_name: 'W48S39' },  // home left
        ]
        lightweight_harvester_targets = [
          // { id: '59f19fef82100e1594f35c6a', room_name: 'W49S39' },  // left
        ]
        this.room_names = [this.room.name, 'W49S34']
        rooms_need_scout = ['W49S39']
        if (!harvester_destination) {
          harvester_destination = Game.getObjectById('5b05392f25d4f474fcc21633') as StructureContainer
        }
        break

      case 'W49S48':
        harvester_targets = [
          { id: '59f19ff082100e1594f35c89', room_name: 'W49S48' },  // bottom, bottom left
          { id: '59f19ff082100e1594f35c8b', room_name: 'W49S49' },  // bottom bottom
        ]
        this.room_names = [this.room.name, 'W49S49']
        break

      case 'W49S34':
        lightweight_harvester_targets = [
          { id: '59f19ffe82100e1594f35ddb', room_name: 'W48S34' },
          { id: '59f19fef82100e1594f35c62', room_name: 'W49S36' },  // right
          { id: '59f19ffe82100e1594f35ddf', room_name: 'W48S35' },  // left
          { id: '59f19ffe82100e1594f35dde', room_name: 'W48S35' },  // right
        ]
        this.room_names = [this.room.name]
        rooms_need_to_be_defended = ['W48S34', 'W49S36', 'W48S35']
        rooms_need_scout = ['W48S34', 'W49S36', 'W48S35']
        break

      default:
        console.log(`Spawn.initialize unexpected spawn name, ${this.name}`)
        break
    }

    // --
    this.attacked_rooms = this.room_names.map((room_name) => {
      return Game.rooms[room_name]
    }).filter((room) => {
      return !(!room)
    }).filter((room) => {
      return room.attacked
    })

    const attacked = rooms_need_to_be_defended.map((room_name) => {
      return Game.rooms[room_name]
    }).filter((room) => {
      return !(!room)
    }).filter((room) => {
      return room.attacked && !room.heavyly_attacked
    })

    this.attacked_rooms = this.attacked_rooms.concat(attacked)

    if (this.attacked_rooms.length > 0) {
      const message = `Room ${this.attacked_rooms} are attacked!! ${this.name}`
      console.log(message)
      // Game.notify(message)
    }

    // -- Memory --
    let worker_squad: WorkerSquad | null = null
    let upgrader_squad: UpgraderSquad | null = null
    let researcher_squad: ResearcherSquad | null = null
    let raider_squad: RaiderSquad | null = null
    let invader_squad: InvaderSquad | null = null
    const invade_target = 'W45S41'
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
      squad_memory.owner_name = this.name  // @fixme: this is a migration code

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
        const squad = new UpgraderSquad(squad_memory.name, this.room.name, upgrader_source_ids)
        upgrader_squad = squad
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
        const squad = new InvaderSquad(squad_memory.name, this.room.name, invade_target)

        invader_squad = squad
        this.squads.set(squad.name, squad)
        break
      }
      case SquadType.TEMP: {
        const squad = new TempSquad(squad_memory.name, this.room.name)

        this.squads.set(squad.name, squad)
        break
      }
      default:
        console.log(`Unexpected squad type ${squad_memory}`)
        break
      }
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
      }
      Memory.squads[squad.name] = memory

      console.log(`Create roomkeeper for ${room_name}, assigned: ${squad.name}`)
      break // To not create squads with the same name
    }

    // --- Worker ---
    if (!worker_squad) {
      const name = WorkerSquad.generateNewName()
      const squad = new WorkerSquad(name, this.room.name)

      worker_squad = squad
      this.squads.set(squad.name, squad)

      const memory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
      }
      Memory.squads[squad.name] = memory

      console.log(`Create worker for ${this.name}, assigned: ${squad.name}`)
    }
    this.worker_squad = worker_squad as WorkerSquad

    // --- Upgrader ---
    if (!upgrader_squad) {
      const name = UpgraderSquad.generateNewName()
      const squad = new UpgraderSquad(name, this.room.name, upgrader_source_ids)

      upgrader_squad = squad
      this.squads.set(squad.name, squad)

      const memory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
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
      const name = ResearcherSquad.generateNewName()
      const squad = new ResearcherSquad(name, this.room.name, research_input_targets, research_output_targets)

      researcher_squad = squad
      this.squads.set(squad.name, squad)

      const memory: SquadMemory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
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
      }
      Memory.squads[squad.name] = memory

      console.log(`Create lightweight harvester for ${target.room_name} ${target.room_name}, assigned: ${squad.name}`)
      break // To not create squads with the same name
    }

    // --- Scout ---
    if ((!this.scout_squad) && (rooms_need_scout.length > 0)) {
      const name = ScoutSquad.generateNewName()
      const squad = new ScoutSquad(name, rooms_need_scout)

      this.scout_squad = squad
      this.squads.set(squad.name, squad)

      const memory: SquadMemory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
      }
      Memory.squads[squad.name] = memory

      console.log(`Create scout for ${rooms_need_scout}, assigned: ${squad.name}`)
    }

    // --- Attacker ---
    if (!this.defend_squad) {
      const name = AttackerSquad.generateNewName()
      const squad = new AttackerSquad(name, this.attacked_rooms, this.room, energy_capacity)

      this.defend_squad = squad
      this.squads.set(squad.name, squad)

      const memory: SquadMemory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
      }
      Memory.squads[squad.name] = memory

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
    // if (!this.manual_squad) {
    //   const name = ManualSquad.generateNewName()
    //   const squad = new ManualSquad(name, this.room.name)

    //   this.manual_squad = squad
    //   this.squads.set(squad.name, squad)

    //   const memory = {
    //     name: squad.name,
    //     type: squad.type,
    //     owner_name: this.name,
    //   }
    //   Memory.squads.push(memory)
    // }

    // --- Construction site ---
    for (const flag_name in Game.flags) {
      const flag = Game.flags[flag_name]
      if (flag.room && (flag.room.name != this.room.name)) {
        continue
      }
      if (this.room.spawns.length == 0) {
        continue
      }
      if (this.room.find(FIND_CONSTRUCTION_SITES).length > 0) {
        continue
      }

      if (this.room.createConstructionSite(flag.pos, STRUCTURE_EXTENSION) == OK) {
        console.log(`Place extension construction site on ${flag.pos.x}, ${flag.pos.y}`)
        flag.remove()

        break // If deal with all flags once, createConstructionSite() succeeds each call but when it actually runs (that is the end of the tick) it fails
        // so call it one by one
      }
    }

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

    this.squads_need_spawn = highest_priority == SpawnPriority.NONE ? [] : sorted.filter((squad) => {

      const is_lightweight_harvester = squad.type == SquadType.LIGHTWEIGHT_HARVESTER
      const worker_squad_name = this.worker_squad.name
      const worker_harvester = Array.from(this.worker_squad.creeps.values()).filter((creep) => {
        return (creep.memory.type == CreepType.HARVESTER)
          && (creep.memory.squad_name == worker_squad_name)
          && ((creep.ticksToLive || 0) > 300)
      }
      )[0]
      const number_of_workers = this.worker_squad.creeps.size

      if (is_lightweight_harvester && worker_harvester && (number_of_workers > 4) && (squad.creeps.size == 0)) {
        worker_harvester.memory.squad_name = squad.name
        worker_harvester.memory.status = CreepStatus.CHARGE
        console.log(`Creep ${worker_harvester.name} is assigned to ${squad.name}, from ${this.worker_squad.name} ${this.name}`)
        return false
      }

      return (squad.spawnPriority == highest_priority) && (squad.hasEnoughEnergy(availableEnergy, energy_capacity))
    })

    // --- Defend ---
    // Tower
    this.towers = this.room.find(FIND_MY_STRUCTURES, {
      filter: (structure) => {
        return structure.structureType == STRUCTURE_TOWER
      }
    }) as StructureTower[]
    // const is_safemode_active = (this.room && this.room.controller) ? ((this.room!.controller!.safeMode || 0) > 0) : false

    this.towers.forEach((tower) => {
      // if (!is_safemode_active) {
        if ((this.room.attacker_info.heal < 15)) {
          const closestDamagedHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
            filter: (creep) => {
              return creep.hits < creep.hitsMax
            }
          })
          if(closestDamagedHostile) {
            tower.attack(closestDamagedHostile)
            return
          }
          else {
            const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
            if(closestHostile) {
              tower.attack(closestHostile)
              return
            }
          }
        }
      // }

      const closest_damaged_creep = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
        filter: (creep) => creep.hits < creep.hitsMax
      })
      if (closest_damaged_creep) {
        tower.heal(closest_damaged_creep)
      }
      else if ((tower.energy > (tower.energyCapacity * 0.66))) {
        if (this.room.name == 'W49S34') {
          const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, { // To Detect non-ownable structures
            filter: (structure) => {
              const is_wall = (structure.structureType == STRUCTURE_WALL)
              if (is_wall) {
                return false
              }
              else if (structure.structureType == STRUCTURE_RAMPART) {
                return structure.hits < 100000
              }
              const max = 100000
              return (structure.hits < Math.min(structure.hitsMax, max))
            }
          })
          if(closestDamagedStructure) {
            tower.repair(closestDamagedStructure)
          }
        }
        else {
          let hits_max = 150000
          if (this.room.storage && (this.room.storage.store.energy > 500000)) {
            hits_max = 300000
          }
          const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, { // To Detect non-ownable structures
            filter: (structure) => {
              const is_wall = (structure.structureType == STRUCTURE_WALL) || (structure.structureType == STRUCTURE_RAMPART)
              const max = is_wall ? hits_max : 100000
              return (structure.hits < Math.min(structure.hitsMax, max))
            }
          })
          if(closestDamagedStructure) {
            tower.repair(closestDamagedStructure)
          }
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
              console.log(`Lab.runReaction failed with ${reaction_result}, ${this.name}`)
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
    const sources = this.room.sources
    this.squads.forEach((squad, _) => {
      ErrorMapper.wrapLoop(() => {
        squad.run()
      })()
    })

    let destination_id: string | undefined

    switch (this.room.name) {
      case 'E13S19':  // @fixme: it's in wc server, check Game.shard.name
        break

      case 'W48S47': {
        destination_id = '5af5c771dea4db08d5fb7c84'  // Link for upgrader
        const link = Game.getObjectById(destination_id) as StructureLink
        if (link.energy > (link.energyCapacity / 2)) {
          destination_id = '5aee959afd02f942b0a03361'
        }
        // The link next to the storage is not currently used
        break
      }
      case 'W49S47':
        destination_id = '5af1900395fe4569eddba9da'
        break

      case 'W44S42':
        destination_id = '5af19011f859db1e994a8d6d'
        break

      case 'W48S39':
        destination_id = '5b0a2b654e8c62672f3191fb'
        break

      case 'W49S48':
        destination_id = '5b0a45f2f30cc0671dc1e8e1'
        break

      default:
        break
    }

    if (destination_id) {
      this.transferLinks(destination_id)
    }
    this.spawnAndRenew()
    this.drawDebugInfo()
    this.activateSafeModeIfNeeded()
  }

  // --- Private ---
  private activateSafeModeIfNeeded() {
    if (this.room.name != 'W49S34') {
      const w49s34 = Game.rooms['W49S34']

      if (w49s34 && w49s34.controller && w49s34.controller.my && ((w49s34.controller.safeModeCooldown || 0) < 20000)) {
        return
      }
    }

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
     const healers = room.find(FIND_HOSTILE_CREEPS, {
      filter: (creep) => {
        return creep.getActiveBodyparts(HEAL) > 0
      }
    })
    if (healers.length == 0) {
      return
    }
    console.log('DETECT ', healers.length, ' Healer-Attackers!!! owner: ', healers[0].owner.username)

    const damaged_structures = room.find(FIND_MY_STRUCTURES, {
      filter: (structure) => {
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
        return (important_structures.indexOf(structure.structureType) >= 0)
          && (structure.hits < structure.hitsMax)
      }
    })
    if (damaged_structures.length > 0) {
      const message = `Activate safe mode at ${room.name} : ${room.controller.activateSafeMode()}, damaged structures: ${damaged_structures}`
      console.log(message)
      Game.notify(message)
      return
    }

    const number_of_creeps = room.find(FIND_MY_CREEPS).length
    if (number_of_creeps < 5) {
      const message = `Activate safe mode at ${room.name} : ${room.controller.activateSafeMode()}, number of creeps: ${number_of_creeps}`
      console.log(message)
      Game.notify(message)
      return
    }
  }

  private transferLinks(destination_id: string) {

    let destination: StructureLink = Game.getObjectById(destination_id) as StructureLink
    if (!destination) {
      console.log(`Region.transferLinks no destination found ${this.name}`)
      return
    }
    if (destination.energy > (destination.energyCapacity / 2)) {
      return
    }

    const links: StructureLink[] = (this.room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return (structure.structureType == STRUCTURE_LINK)
          && (structure.id != destination.id)
          && (structure.id != '5af5c771dea4db08d5fb7c84') // W48S43 link next to storage
      }
    }) as StructureLink[]).filter((link) => {
      if (link.energy == 0) {
        return false
      }
      if ((link.cooldown == 0) && (link.energy > (link.energyCapacity / 2))) {
        return true
      }
      if (link.energy == link.energyCapacity) {
        return true
      }
      return false
    })

    for (const link of links) {
      if (link.transferEnergy(destination) == OK) {
        return  // To not consume all link's cooldown time at once
      }
    }
  }

  private spawnAndRenew(): void {
    const availableEnergy = this.room.energyAvailable
    let squad_needs_spawn = this.delegated_squads.concat(this.squads_need_spawn)

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
          console.log(`${spawn.name} in ${this.name} [${body}] and assign to ${squad.name}: ${result}`)
          return result
        })
      }
    })
  }

  private drawDebugInfo(): void { // @todo: Show debug info for each rooms
    let pos: {x: number, y: number} = {x: 1, y: 1}

    switch(this.room.name) {
      case 'E13S19':  // @fixme: it's in wc server, check Game.shard.name
        break

      case 'W48S47':
        break

      case 'W49S47':
        pos = {x: 21, y: 30}
        break

      case 'W44S42':
        pos = {x: 25, y: 26}
        break

      case 'W49S48':
        pos = {x: 23, y: 30}
        break

      case 'W49S34':
        pos = {x: 1, y: 21}
        break

      default:
        break
    }

    let lines: string[] = [
      `${this.name} in ${this.room.name}`,
      `  Rooms: ${this.room_names}`,
      `  Squads: ${this.squads.size}, Creeps: ${_.sum(Array.from(this.squads.values()).map(s=>s.creeps.size))}`,
    ]

    const squad_descriptions = this.squadDescriptions(Array.from(this.squads.values()))
    lines = lines.concat(squad_descriptions)

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
