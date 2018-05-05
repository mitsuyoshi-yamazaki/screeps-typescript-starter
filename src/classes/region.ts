import { Squad, SquadType, SquadMemory, SpawnPriority } from "classes/squad/squad"
import { ControllerKeeperSquad, ControllerKeeperSquadMemory } from "classes/squad/controller_keeper"
import { WorkerSquad } from "classes/squad/worker"
import { ManualSquad } from "classes/squad/manual"
import { HarvesterSquadMemory, HarvesterSquad } from "./squad/harvester";
import { CreepStatus, ActionResult } from "./creep";

export class Region {
  // Public
  public get room(): Room {
    return this.controller.room
  }
  public get name(): string {
    return this.room.name
  }

  // Private
  private squads = new Map<string, Squad>()
  private worker_squad: WorkerSquad
  private manual_squad?: ManualSquad
  private room_names: string[] = []
  private towers: StructureTower[] = []
  private spawns = new Map<string, StructureSpawn>()

  constructor(readonly controller: StructureController) {
    if (!controller || !controller.my) {
      const message = `Region() controller not provided or not mine ${controller}`
      console.log(message)
      Game.notify(message)

      this.worker_squad = new WorkerSquad('', '') // dummy
      return
    }

    // Spawns
    (this.room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return structure.structureType == STRUCTURE_SPAWN
      }
    }) as StructureSpawn[]).forEach((spawn) => {
      this.spawns.set(spawn.name, spawn)
    })

    this.spawns.forEach((spawn, _) => {
      spawn.initialize()
    })

    // --- Initialize variables ---
    let harvester_targets: {id: string, room_name: string}[]

    const storage = this.room.find(FIND_STRUCTURES, {
      filter: structure => {
        return (structure.structureType == STRUCTURE_STORAGE)
      }
    })[0] as StructureStorage

    const container = this.room.find(FIND_STRUCTURES, {
      filter: structure => {
        return (structure.structureType == STRUCTURE_CONTAINER)
      }
    })[0] as StructureContainer

    let harvester_destination: StructureStorage | StructureContainer = storage || container

    switch (this.room.name) {
      case 'W48S47':
        harvester_targets = [
          { id: '59f19fff82100e1594f35e06', room_name: 'W48S47' },  // home top right
          { id: '59f19fff82100e1594f35e08', room_name: 'W48S47' },  // home center
          { id: '59f1a00e82100e1594f35f82', room_name: 'W47S47' },  // right
          { id: '59f19fff82100e1594f35e0a', room_name: 'W48S48' },  // bottom
          { id: '59f1a00e82100e1594f35f80', room_name: 'W47S46' },  // top right
          { id: '59f1a00e82100e1594f35f85', room_name: 'W47S48' },  // bottom right
          { id: '59f1a00e82100e1594f35f87', room_name: 'W47S48' },  // bottom right
        ]
        this.room_names = [this.room.name, 'W47S47', 'W48S48', 'W47S46', 'W44S42', 'W47S48']
        break

      case 'W49S47':
        harvester_targets = [
          { id: '59f19ff082100e1594f35c84', room_name: 'W49S47' },
          { id: '59f19ff082100e1594f35c83', room_name: 'W49S47' },
        ]
        this.room_names = [this.room.name]
        harvester_destination = Game.getObjectById('5aecaab70409f23c73d4e993') as StructureContainer
        break

      case 'W44S42':
        harvester_targets = []
        this.room_names = [this.room.name]
        break

      default:
        harvester_targets = []
        this.room_names = []
        console.log(`Spawn.initialize unexpected spawn name, ${this.name}`)
        break
    }

    // -- Memory --
    let worker_squad: WorkerSquad | null = null

    for (const squad_memory of Memory.squads) {
      if (squad_memory.owner_name != this.name) {
        continue
      }
      squad_memory.owner_name = this.name  // @fixme: this is a migration code

      switch (squad_memory.type) {
      case SquadType.CONTROLLER_KEEPER: {
        const controller_keeper_squad_memory = squad_memory as ControllerKeeperSquadMemory
        const room_name = controller_keeper_squad_memory.room_name

        const squad = new ControllerKeeperSquad(squad_memory.name, room_name)
        this.squads.set(squad.name, squad)

        const room = Game.rooms[room_name]
        if (room) {
          room.keeper = squad
        }
        break
      }
      case SquadType.WORKER: {
        const squad = new WorkerSquad(squad_memory.name, this.room.name)
        worker_squad = squad
        this.squads.set(squad.name, squad)
        break
      }
      case SquadType.HARVESTER: {
        const harvester_squad_memory = squad_memory as HarvesterSquadMemory
        const source_info = {
          id: harvester_squad_memory.source_id,
          room_name: harvester_squad_memory.room_name,
        }

        const squad = new HarvesterSquad(squad_memory.name, source_info, harvester_destination)
        this.squads.set(squad.name, squad)
        break
      }
      case SquadType.MANUAL: {
        const squad = new ManualSquad(squad_memory.name, this.room.name)

        this.manual_squad = squad
        this.squads.set(squad.name, squad)
        break
      }
      default:
        console.log(`Unexpected squad type ${squad_memory}`)
        break
      }
    }

    // --- Room ---
    this.room_names.forEach(room_name => {
      let room_memory = Memory.rooms[room_name]

      if (!room_memory) {
        room_memory = {
          harvesting_source_ids: []
        }
        Memory.rooms[room_name] = room_memory
      }

      if (room_memory.keeper_squad_name) {
        return
      }

      const name = ControllerKeeperSquad.generateNewName()
      const squad = new ControllerKeeperSquad(name, room_name)

      Memory.rooms[room_name].keeper_squad_name = squad.name
      this.squads.set(squad.name, squad)

      const memory: ControllerKeeperSquadMemory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
        room_name: room_name,
      }
      Memory.squads.push(memory)

      console.log(`Missing roomkeeper for ${room_name}, assigned: ${squad.name}`)
    })

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
      Memory.squads.push(memory)
    }
    this.worker_squad = worker_squad as WorkerSquad

    // --- Harvester ---
    harvester_targets.forEach(target => {

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
        return
      }
      Memory.rooms[target.room_name].harvesting_source_ids.push(target.id)

      const name = HarvesterSquad.generateNewName()
      const squad = new HarvesterSquad(name, target, harvester_destination)

      this.squads.set(squad.name, squad)

      const memory: HarvesterSquadMemory = {
        name: squad.name,
        type: squad.type,
        owner_name: this.name,
        source_id: target.id,
        room_name: target.room_name,
      }
      Memory.squads.push(memory)
    })

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
      if (flag.room!.name != this.room.name) {
        continue
      }

      if (this.room.createConstructionSite(flag.pos, STRUCTURE_EXTENSION) == OK) {
        flag.remove()

        console.log(`Place extension construction site on ${flag.pos.x}, ${flag.pos.y}`)
        break // If deal with all flags once, createConstructionSite() succeeds each call but when it actually runs (that is the end of the tick) it fails
        // so call it one by one
      }
    }

    //  --- Defend ---
    // Tower
    this.towers = this.room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return structure.structureType == STRUCTURE_TOWER
      }
    }) as StructureTower[]

    this.towers.forEach((tower) => {
      const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
      if(closestHostile) {
          tower.attack(closestHostile)
      }
      else if (tower.energy > (tower.energyCapacity / 2)) {
        const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
          filter: (structure) => {
              return (structure.hits < Math.min(structure.hitsMax, 100000))
          }
        })
        if(closestDamagedStructure) {
          tower.repair(closestDamagedStructure)
        }
      }
      // @todo: heal
    })

    // Safe mode
    // @todo: this codes should be located on somewhere like Empire
    if (Game.time % 2 == 0) {
      const room = this.room

      const attackers = room.find(FIND_HOSTILE_CREEPS, {
          filter: (creep) => {
              return (creep.getActiveBodyparts(ATTACK) + creep.getActiveBodyparts(RANGED_ATTACK) + creep.getActiveBodyparts(MOVE)) > 0;
          }
      })

      let should_turn_safemode_on = false

      if (attackers.length >= 2) {
        console.log('DETECT ', attackers.length, ' ATTACKERS!!! owner: ', attackers[0].owner.username)

        if ((room.controller!.safeMode != undefined) && (room.controller!.safeMode! > 0)) {
          console.log('Safemode active')
        }
        else {
          should_turn_safemode_on = true
        }
      }

      this.spawns.forEach((spawn) => {
        if (spawn.hits < spawn.hitsMax) {
          should_turn_safemode_on = true
        }
      })

      if (should_turn_safemode_on) {
        console.log('Activate safe mode')
        room.controller!.activateSafeMode()
      }
    }

    this.drawDebugInfo()
  }

  public say(message: string): void {
    this.squads.forEach((squad, _) => {
      squad.say(message)
    })
  }

  public run(): void {
    const sources = this.room.sources
    this.squads.forEach((squad, _) => {
      squad.run()
    })

    this.spawnAndRenew()
  }

  // --- Private ---
  private spawnAndRenew(): void {
    if (this.squads.size == 0) {
      console.log(`${this.name} doesn't have any squads`)
      return
    }

    const sorted = Array.from(this.squads.values()).sort(function(lhs, rhs) {
      const l_priority = lhs.spawnPriority
      const r_priority = rhs.spawnPriority
      if (l_priority < r_priority) return -1
      else if (l_priority > r_priority) return 1
      else return 0
    })

    const highest_priority = sorted[0].spawnPriority
    const availableEnergy = this.room.energyAvailable
    const energyCapacity = this.room.energyCapacityAvailable

    const filtered: Squad[] = highest_priority == SpawnPriority.NONE ? [] : sorted.filter((squad) => {
      return (squad.spawnPriority == highest_priority) && (squad.hasEnoughEnergy(availableEnergy, energyCapacity))
    })

    Array.from(this.spawns.values()).filter((spawn) => {
      return spawn.renewSurroundingCreeps() == ActionResult.DONE
    }).forEach((spawn) => {
      const squad = filtered.pop()

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
    const pos = {x: 1, y: 1}

    let lines: string[] = [
      `${this.name} in ${this.room.name}`,
      `  Rooms: ${this.room_names}`,
      `  Squads: ${this.squads.size}`,
    ]

    const squad_descriptions = Array.from(this.squads.values()).sort((lhs, rhs) => {
      return (lhs.name > rhs.name) ? 1 : -1
    }).map((squad) => {
      let room_name: string = ""

      if ((squad as HarvesterSquad).source_info) {
        room_name = (squad as HarvesterSquad).source_info.room_name
      }
      else if ((squad as ControllerKeeperSquad).room_name) {
        room_name = (squad as ControllerKeeperSquad).room_name
      }

      return `  - ${squad.name}  ${squad.creeps.size} creeps,  priority: ${squad.spawnPriority},  ${room_name}`
    })

    lines = lines.concat(squad_descriptions)

    this.room.visual.multipleLinedText(lines, pos.x, pos.y, {
      align: 'left',
    })
  }
}
