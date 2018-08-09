import { SquadMemory, SquadType } from "./squad/squad";
import { RegionMemory } from "./region"
import { ErrorMapper } from "utils/ErrorMapper";
import { RemoteHarvesterSquadMemory } from "./squad/remote_harvester";
import { UID, room_history_link, room_link, colored_resource_type } from "./utils";
import { RoomLayout, RoomLayoutOpts } from "./room_layout";

export interface AttackerInfo  {
  hostile_creeps: Creep[]
  hostile_teams: string[]
  attack: number
  ranged_attack: number
  heal: number
  work: number
  tough: number
}

const cost_matrixes = new Map<string, CostMatrix>()
console.log(`Initialize cost_matrixes`)

export type ChargeTarget = StructureExtension | StructureSpawn | StructureTower | StructureTerminal | StructureLab | StructurePowerSpawn | StructureContainer

declare global {
  interface Game {
    version: string
    reactions: {[index: string]: {lhs: ResourceConstant, rhs: ResourceConstant}}
    squad_creeps: {[squad_name: string]: Creep[]}
    check_resources: (resource_type: ResourceConstant) => {[room_name: string]: number}
    check_resources_in: (room_name: string) => void
    check_all_resources: () => void
    check_boost_resources: () => void
    collect_resources: (resource_type: ResourceConstant, room_name: string, threshold?: number) => void
    info: (opts:{sorted?: boolean}) => void
    resource_transfer: (opts?: {reversed?: boolean}) => void
    reset_costmatrix: (room_name: string) => void
    reset_all_costmatrixes: () => void
    creep_positions: (squad_name: string) => void

    show_excluded_walls(room_name: string): void
    add_excluded_walls(room_name: string, x_min: number, x_max: number, y_min: number, y_max: number, opts?: {dry_run?: boolean}): void
  }

  interface Memory {
    last_tick: number
    squads: {[index: string]: SquadMemory}
    temp_squads: SquadMemory[]
    debug_last_tick: any
    versions: string[]
    regions: {[index: string]: RegionMemory}
    cpu_usages: number[]
    trading: {stop: boolean}
    debug: {
      show_visuals: boolean,
      show_path: boolean,
      show_costmatrix: string | null,
      test_send_resources: boolean,
      cpu: {
        show_usage: boolean,
        threshold: number,
        stop_threshold: number,
      },
      test?: number[],
    }
  }

  interface RoomMemory {
    keeper_squad_name?: string
    harvesting_source_ids: string[]
    cost_matrix?: number[] | undefined
    attacked_time?: number
    last_attacked_time?: number
    description_position?: {x:number, y:number}
    exits?: {[exit: number]: {x:number, y:number}}
    ancestor?: string
    is_gcl_farm?: boolean
  }

  interface Room {
    sources: Source[]
    spawns: StructureSpawn[]  // Initialized in Spawn.initialize()
    attacked: boolean // @todo: change it to Creep[]
    heavyly_attacked: boolean
    resourceful_tombstones: Tombstone[]
    attacker_info: AttackerInfo
    is_keeperroom: boolean
    is_centerroom: boolean
    cost_matrix(): CostMatrix | undefined
    construction_sites?: ConstructionSite[]  // Only checked if controller.my is true
    owned_structures?: Map<StructureConstant, AnyOwnedStructure[]>
    owned_structures_not_found_error(structure_type: StructureConstant): void
    add_remote_harvester(from: StructureStorage, carrier_max: number, opts?: {dry_run?: boolean, memory_only?: boolean}): string | null
    remote_layout(x: number, y: number): CostMatrix | null
    layout(center: {x: number, y: number}, opts?: RoomLayoutOpts): RoomLayout | null
    test(from: Structure): void

    initialize(): void

    structures_needed_to_be_charged?: ChargeTarget[]
  }

  interface RoomVisual {
    multipleLinedText(text: string | string[], x: number, y: number, style?: TextStyle): void
  }

  interface CostMatrix {
    add_terrain(room: Room): void
    add_normal_structures(room: Room, opts?: {ignore_public_ramparts?: boolean}): void
    show(room: Room, opt?: {colors?: {[index: number]: string}}): void
  }
}

export function init() {
}

export function tick(): void {
  Game.check_resources = (resource_type: ResourceConstant) => {
    let resources: {[room_name: string]: number} = {}

    let details = ""
    let sum = 0

    for (const room_name of Object.keys(Game.rooms)) {
      const room = Game.rooms[room_name]
      if (!room || !room.controller || !room.controller.my) {
        continue
      }

      let amount = 0

      if (room.terminal && room.terminal.my) {
        amount += room.terminal.store[resource_type] || 0
      }

      if (room.storage && room.storage.my) {
        amount += room.storage.store[resource_type] || 0
      }

      const amount_text = (resource_type == RESOURCE_ENERGY) ? `${Math.floor(amount / 1000)}k` : `${amount}`
      details += `\n${room_link(room_name)}: ${amount_text}`
      sum += amount

      resources[room_name] = amount
    }
    console.log(`Resource ${resource_type}: ${sum}${details}`)

    return resources
  }

  Game.check_resources_in = (room_name: string) => {
    const room = Game.rooms[room_name]
    if (!room || !room.controller || !room.controller.my) {
      console.log(`Game.check_resources_in not my room ${room_name}`)
      return
    }

    console.log(`Resources in ${room_link(room_name)}`)

    RESOURCES_ALL.forEach((r_type) => {
      const resource_type = r_type as ResourceConstant

      let terminal_text = 'none'
      let storage_text = 'none'

      let terminal_amount = 0
      let storage_amount = 0

      if (room.terminal && room.terminal.my) {
        terminal_amount = room.terminal.store[resource_type] || 0
        terminal_text = `${terminal_amount}`
      }
      if (room.storage && room.storage.my) {
        storage_amount = room.storage.store[resource_type] || 0

        if (storage_amount >= 10000) {
          storage_text = `${Math.round(storage_amount / 1000)}`
        }
        else {
          storage_text = `${storage_amount}`
        }
      }

      const amount = terminal_amount + storage_amount

      if (amount == 0) {
        return
      }

      console.log(`${colored_resource_type(resource_type)}\t${amount},\tt: ${terminal_text},\ts: ${storage_text}`)
    })

    for (const r_type of RESOURCES_ALL) {
    }
  }

  Game.check_all_resources = () => {
    RESOURCES_ALL.forEach((resource_type) => {

      let amount = 0

      for (const room_name of Object.keys(Game.rooms)) {
        const room = Game.rooms[room_name]
        if (!room || !room.controller || !room.controller.my) {
          continue
        }

        if (room.terminal && room.terminal.my) {
          amount += room.terminal.store[resource_type] || 0
        }

        if (room.storage && room.storage.my) {
          amount += room.storage.store[resource_type] || 0
        }
      }

      console.log(`${resource_type}: ${amount}`)
    })
  }

  Game.check_boost_resources = () => {
    [
      RESOURCE_CATALYZED_UTRIUM_ACID,
      RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
      RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
      RESOURCE_CATALYZED_ZYNTHIUM_ACID,
      RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
      RESOURCE_CATALYZED_GHODIUM_ALKALIDE,
    ].forEach((resource_type) => {

      let amount = 0

      for (const room_name of Object.keys(Game.rooms)) {
        const room = Game.rooms[room_name]
        if (!room || !room.controller || !room.controller.my) {
          continue
        }

        if (room.terminal && room.terminal.my) {
          amount += room.terminal.store[resource_type] || 0
        }

        if (room.storage && room.storage.my) {
          amount += room.storage.store[resource_type] || 0
        }
      }

      console.log(`${resource_type}: ${amount}`)
    })
  }

  Game.collect_resources = (resource_type: ResourceConstant, room_name: string, threshold?: number) => {
    threshold = threshold || 5000

    const target_room = Game.rooms[room_name]
    if (!target_room || !target_room.terminal || !target_room.terminal.my || (_.sum(target_room.terminal.store) > (target_room.terminal.storeCapacity * 0.8))) {
      console.log(`Game.collect_resources failed: ${room_name} not found`)
      return
    }

    let details = ""
    let sum = 0

    for (const name of Object.keys(Game.rooms)) {
      if (name == room_name) {
        continue
      }

      const room = Game.rooms[name]
      if (!room || !room.terminal || !room.terminal.my) {
        continue
      }

      const amount = room.terminal.store[resource_type] || 0
      if ((amount < 100) || (threshold && (amount > threshold))) {
        details += `\n${name}: ${amount}`
        continue
      }

      details += `\n${name}: ${amount}`

      const result = room.terminal.send(resource_type, amount, room_name)
      if (result == OK) {
        details += ` - ${amount}`
        sum += amount
      }
      else {
        console.log(`Game.collect_resources send failed with ${result}: from ${name} to ${room_name}, (${resource_type}, ${amount}, ${room_name})`)
        details += `  E${result}`
      }
    }

    console.log(`Collect resource ${resource_type} ${room_name}: ${target_room.terminal.store[resource_type] || 0} + ${sum}${details}`)
  }

  Game.info = (opts:{sorted?: boolean}) => {
    opts = opts || {}

    const info = 'info'
    const warn = 'warn'
    const error = 'error'
    const high = 'high'
    const almost = 'almost'

    const colors: {[index: string]: string} = {
      info: 'white',
      warn: '#F9E79F',
      error: '#E74C3C',
      high: '#64C3F9',
      almost: '#47CAB0',
    }

    const colored_text = (text: string, label: 'info' | 'warn' | 'error' | 'high' | 'almost') => {
      const color = colors[label] || 'white'
      return `<span style='color:${color}'>${text}</span>`
    }

    const gcl_progress = Math.round(Game.gcl.progress / 1000000)
    const gcl_progress_total = Math.round(Game.gcl.progressTotal / 1000000)
    const gcl_progress_percentage = Math.round((Game.gcl.progress / Game.gcl.progressTotal) * 1000) / 10

    let gcl_label: 'info' | 'high' | 'almost' = info
    if (gcl_progress_percentage > 90) {
      gcl_label = almost
    } else if (gcl_progress_percentage > 80) {
      gcl_label = high
    }

    const gcl_progress_text = colored_text(`${gcl_progress_percentage}`, gcl_label)

    console.log(`GCL: <b>${Game.gcl.level}</b>, <b>${gcl_progress}</b>M/<b>${gcl_progress_total}</b>M, <b>${gcl_progress_text}</b>%`)

    let rooms: Room[] = []

    for (const room_name of Object.keys(Game.rooms)) {
      const room = Game.rooms[room_name]
      if (!room || !room.controller || !room.controller.my) {
        continue
      }
      rooms.push(room)
    }

    if (opts.sorted) {
      rooms = rooms.sort((lhs, rhs) => {
        if (lhs.controller!.level > rhs.controller!.level) return 1
        if (lhs.controller!.level < rhs.controller!.level) return -1
        return 0
      })
    }

    rooms.forEach((room) => {

      const room_name = room.name
      const controller = room.controller!
      const rcl = controller.level
      const progress_percentage = Math.round((controller.progress / controller.progressTotal) * 1000) / 10

      let progress_label: 'info' | 'high' | 'almost' = info
      if (progress_percentage > 90) {
        progress_label = almost
      } else if (progress_percentage > 80) {
        progress_label = high
      }

      const progress_text = colored_text(`${progress_percentage}`, progress_label)
      const progress = (rcl >= 8) ? 'Max' : `<b>${progress_text}</b> %`

      const region_memory = Memory.regions[room_name] as RegionMemory | undefined // Assuming region.name == region.room.name
      let reaction_output: string = (!(!region_memory) && !(!region_memory.reaction_outputs)) ? (region_memory.reaction_outputs[0] || `<span style='color:${colors[warn]}'>none</span>`) : `<span style='color:${colors[warn]}'>none</span>`

      if (rcl < 6) {
        reaction_output = '-'
      }

      const storage_amount = !room.storage ? "" : `${Math.round((_.sum(room.storage.store) / room.storage.storeCapacity) * 100)}%`
      const storage_capacity = !room.storage ? "" : ` <b>${Math.round(room.storage.store.energy / 1000)}</b>kE`

      let spawn_busy_time = 0
      let spawn_time = 0

      room.spawns.forEach((spawn) => {
        spawn_busy_time += spawn.memory.spawning.filter(s=>s).length
        spawn_time += 1000
      })

      const spawn_usage = Math.round((spawn_busy_time / spawn_time) * 100)
      let spawn_log_level: 'info' | 'warn' | 'error'

      if (spawn_usage > 90) {
        spawn_log_level = 'error'
      }
      else if (spawn_usage > 75) {
        spawn_log_level = 'warn'
      }
      else {
        spawn_log_level = 'info'
      }

      const spawn = `Spawn usage ${colored_text(spawn_usage.toString(10), spawn_log_level)} % (${room.spawns.length})`

      let heavyly_attacked = ''
      if (region_memory && region_memory.last_heavy_attacker) {
        const ticks = region_memory.last_heavy_attacker.ticks
        const text = `${Game.time - ticks} ticks ago`
        heavyly_attacked = `heavyly attacked ${room_history_link(room_name, ticks, {text})}`
      }

      console.log(`${room_link(room_name)}\tRCL:<b>${controller.level}</b>  <b>${progress}</b>\t${reaction_output}\t${spawn}\tStorage: ${storage_amount}\t${storage_capacity}\t${heavyly_attacked}`)
    })
  }

  Game.resource_transfer = (opts?: {reversed?: boolean}) => {
    opts = opts || {}
    let resources: {[room_name: string]: {[room_name: string]: ResourceConstant[]}} = {}

    const detail = opts.reversed ? ' (reversed)' : ''
    console.log(`Resource transfer${detail}:`)

    const no_transfer_rooms: string[] = []

    for (const room_name of Object.keys(Game.rooms)) {
      const room = Game.rooms[room_name]
      if (!room || !room.controller || !room.controller.my) {
        continue
      }

      const region_memory = Memory.regions[room.name]
      if (!region_memory || !region_memory.resource_transports) {
        // console.log(` - ${room.name}: none`)
        if (!opts.reversed) {
          no_transfer_rooms.push(room_name)
        }
        continue
      }

      if (opts.reversed) {
        for (const destination_room_name in region_memory.resource_transports) {
          if (!resources[destination_room_name]) {
            resources[destination_room_name] = {}
          }
          resources[destination_room_name][room.name] = region_memory.resource_transports[destination_room_name]
        }
      }
      else {
        console.log(` - ${room_link(room.name)}:`)

        for (const destination_room_name in region_memory.resource_transports) {
          const resources = region_memory.resource_transports[destination_room_name]
          if (!resources || (resources.length == 0)) {
            continue
          }
          console.log(`   ->${destination_room_name}: ${resources}`)
        }
      }
    }

    if (opts.reversed) {
      for (const room_name in resources) {
        console.log(` - ${room_link(room_name)}:`)

        if (!resources[room_name]) {
          no_transfer_rooms.push(room_name)
        }

        let receiving = false

        for (const from_room_name in resources[room_name]) {
          const r = resources[room_name][from_room_name]
          if (r && (r.length > 0)) {
            receiving = true
            console.log(`   <-${from_room_name}: ${r}`)
          }
        }

        if (!receiving) {
          no_transfer_rooms.push(room_name)
        }
      }
      console.log(` - None: ${no_transfer_rooms}`)
    }
    else {
      console.log(` - None: ${no_transfer_rooms}`)
    }
  }

  Game.reset_costmatrix = (room_name: string) => {
    ErrorMapper.wrapLoop(() => {
      console.log(`RESET costmatrix for ${room_name}`)

      const room_memory = Memory.rooms[room_name]

      if (!room_memory) {
        console.log(`Reset costmatrix no room memory for ${room_name}: probably writing wrong code`)
        return
      }

      Memory.rooms[room_name].cost_matrix = undefined
      cost_matrixes.delete(room_name)

    }, `Game.reset_costmatrix for ${room_name}`)()
  }

  Game.reset_all_costmatrixes = () => {
    ErrorMapper.wrapLoop(() => {
      console.log(`RESET ALL costmatrixes`)

      for (const room_name in Memory.rooms) {
        const room_memory = Memory.rooms[room_name]

        if (!room_memory) {
          console.log(`Reset costmatrix no room memory for ${room_name}: probably writing wrong code`)
          break
        }

        Memory.rooms[room_name].cost_matrix = undefined
        cost_matrixes.delete(room_name)
      }
    }, `Game.reset_all_costmatrix`)()
  }

  Game.creep_positions = (squad_name: string) => {
    console.log(`${squad_name}`)

    ErrorMapper.wrapLoop(() => {
      for (const creep_name in Game.creeps) {
        const creep = Game.creeps[creep_name]

        if (creep.memory.squad_name != squad_name) {
          continue
        }

        const spawning = creep.spawning ? ' (spawning)' : ''
        console.log(`Creep ${creep.name} at ${creep.pos} ${room_link(creep.pos.roomName)}${spawning}`)
      }
    }, `Game.creep_positions`)()
  }

  Game.show_excluded_walls = function(room_name: string): void {
    const room = Game.rooms[room_name]
    if (!room) {
      console.log(`Game.show_excluded_walls no room ${room_name}`)
      return
    }

    const region_memory = Memory.regions[room_name]
    if (!region_memory) {
      console.log(`Game.show_excluded_walls no region memory for ${room_name}`)
      return
    }

    if (!region_memory.excluded_walls || (region_memory.excluded_walls.length == 0)) {
      console.log(`No excluded walls in ${room_name}`)

      room.visual.text(`NO EXCLUDED WALLS`, 25, 25, {
        align: 'center',
        opacity: 1.0,
        font: '20px',
        color: '#ff0000',
      })
      return
    }

    region_memory.excluded_walls.forEach((id) => {
      const wall = Game.getObjectById(id) as StructureWall | StructureRampart | undefined
      if (!wall) {
        console.log(`Game.show_excluded_walls no wall ${id} in ${room_name}`)
        return
      }

      let sign = '■'

      if ([STRUCTURE_WALL, STRUCTURE_RAMPART].indexOf(wall.structureType) < 0) {
        console.log(`Game.show_excluded_walls not wall ${id} at ${wall.pos} in ${room_name}`)
        sign = '!!'
      }

      room.visual.text(sign, wall.pos, {
        align: 'center',
        opacity: 1.0,
        font: '12px',
        color: '#ff0000',
      })
    })
  }

  Game.add_excluded_walls = function(room_name: string, x_min: number, x_max: number, y_min: number, y_max: number, opts?: {dry_run?: boolean}): void {
    const room = Game.rooms[room_name]
    if (!room) {
      console.log(`Game.add_excluded_walls no room ${room_name}`)
      return
    }

    const region_memory = Memory.regions[room_name]
    if (!region_memory) {
      console.log(`Game.add_excluded_walls no region memory for ${room_name}`)
      return
    }

    if (!region_memory.excluded_walls) {
      region_memory.excluded_walls = []
    }

    opts = opts || {}
    const dry_run = !(opts.dry_run == false)
    const added: StructureWall[] = []

    console.log(`Game.add_excluded_walls dry_run: ${dry_run}`)

    room.find(FIND_STRUCTURES, {
      filter: structure => {
        if (structure.structureType != STRUCTURE_WALL) {
          return false
        }
        if ((structure.pos.x < x_min) || (structure.pos.x > x_max)) {
          return false
        }
        if ((structure.pos.y < y_min) || (structure.pos.y > y_max)) {
          return false
        }
        return true
      }
    }).forEach(wall => {
      if (region_memory.excluded_walls!.indexOf(wall.id) < 0) {
        if (!dry_run) {
          added.push(wall as StructureWall)
        }

        room.visual.text('■', wall.pos, {
          align: 'center',
          opacity: 1.0,
          font: '12px',
          color: '#ff0000',
        })
      }
    })

    if (!dry_run) {
      if (added.length > 0) {
        console.log(`Added:`)
        added.forEach(wall => {
          region_memory.excluded_walls!.push(wall.id)
          console.log(`${wall.id} at ${wall.pos} ${wall.structureType}`)
        })
      }
      else {
        console.log(`No walls added`)
      }
    }
  }

  // --- Room
  Room.prototype.initialize = function() {
    let room_memory: RoomMemory | undefined = Memory.rooms[this.name] as RoomMemory | undefined

    if (!room_memory) {
      room_memory = {
        harvesting_source_ids: [],
      }
      Memory.rooms[this.name] = room_memory
    }

    this.sources = this.find(FIND_SOURCES)

    const attacker_info: AttackerInfo = {
      hostile_creeps: [],
      hostile_teams: [],
      attack: 0,
      ranged_attack: 0,
      heal: 0,
      work: 0,
      tough: 0,
    }

    attacker_info.hostile_creeps = this.find(FIND_HOSTILE_CREEPS)

    attacker_info.hostile_creeps.forEach((creep: Creep) => {
      if (attacker_info.hostile_teams.indexOf(creep.owner.username) < 0) {
        attacker_info.hostile_teams.push(creep.owner.username)
      }

      attacker_info.attack = creep.getActiveBodyparts(ATTACK)
      attacker_info.ranged_attack = creep.getActiveBodyparts(RANGED_ATTACK)
      attacker_info.heal = creep.getActiveBodyparts(HEAL)
      attacker_info.work = creep.getActiveBodyparts(WORK)
      attacker_info.tough = creep.getActiveBodyparts(TOUGH)
    })
    this.attacker_info = attacker_info

    if (this.attacker_info.hostile_creeps.length > 0) {
      (Memory.rooms[this.name] as RoomMemory).last_attacked_time = (Memory.rooms[this.name] as RoomMemory).attacked_time;
      (Memory.rooms[this.name] as RoomMemory).attacked_time = Game.time;
    }
    else {
      (Memory.rooms[this.name] as RoomMemory).attacked_time = undefined
    }

    const hostiles: Creep[] = this.find(FIND_HOSTILE_CREEPS, {
      // filter: function(creep: Creep): boolean {
      //   if (creep.pos.x == 0) {
      //     return false
      //   }
      //   if (creep.pos.x == 49) {
      //     return false
      //   }
      //   if (creep.pos.y == 0) {
      //     return false
      //   }
      //   if (creep.pos.y == 49) {
      //     return false
      //   }

      //   const attack_parts = creep.getActiveBodyparts(ATTACK) + creep.getActiveBodyparts(RANGED_ATTACK)
      //   return attack_parts > 0
      // }
    })

    this.attacked = hostiles.length > 0

    let number_of_attacks = 0

    hostiles.forEach((creep: Creep) => {
      number_of_attacks += (creep.getActiveBodyparts(ATTACK) * 3) + creep.getActiveBodyparts(RANGED_ATTACK) + creep.getActiveBodyparts(HEAL)
    })
    this.heavyly_attacked = number_of_attacks > 16

    this.resourceful_tombstones = this.find(FIND_TOMBSTONES, {
      filter: (tombstone: Tombstone) => {
        const sum = _.sum(tombstone.store)
        const mineral_amount = sum - tombstone.store.energy
        return mineral_amount > 0
      }
    })

    if (!this.resourceful_tombstones) {
      this.resourceful_tombstones = []
    }

    if (this.controller && this.controller.my) {
      this.construction_sites = this.find(FIND_CONSTRUCTION_SITES, {
        filter: (site: ConstructionSite) => site.my
      })
    }

    if (this.controller && this.controller.my) {
      this.owned_structures = new Map<StructureConstant, AnyOwnedStructure[]>()

      this.find(FIND_MY_STRUCTURES).forEach((structure: AnyOwnedStructure) => {
        // if (!structure.isActive()) { // consumes too much CPU
        //   return
        // }
        let structure_list: AnyOwnedStructure[] | null = this.owned_structures.get(structure.structureType)
        if (!structure_list) {
          structure_list = []
        }

        structure_list.push(structure)
        this.owned_structures.set(structure.structureType, structure_list)
      })
    }

    const prefix = (Number(this.name.slice(1,3)) + 6) % 10
    const suffix = (Number(this.name.slice(4,6)) + 6) % 10
    this.is_centerroom = ((prefix == 1) && (suffix == 1))
    this.is_keeperroom = (prefix <= 2) && (suffix <= 2) && !this.is_centerroom
  }

  Room.prototype.cost_matrix = function(): CostMatrix | undefined {
    if (!this.is_keeperroom) {
      return undefined
    }

    let cost_matrix: CostMatrix | undefined = cost_matrixes.get(this.name)
    if (cost_matrix) {
      return cost_matrix
    }

    let room_memory: RoomMemory | undefined = Memory.rooms[this.name] as RoomMemory | undefined
    if (!room_memory) {
      console.log(`Room.cost_matrix() unexpectedly find null room memory ${this.name}`)
      return undefined
    }
    if (room_memory.cost_matrix) {
      let cost_matrix = PathFinder.CostMatrix.deserialize(room_memory.cost_matrix)

      if (cost_matrix) {
        cost_matrixes.set(this.name, cost_matrix)
        return cost_matrix
      }
      else {
        console.log(`Room.cost_matrix() unexpectedly find null cost matrix from PathFinder.CostMatrix.deserialize() ${this.name}`)
      }
    }

    cost_matrix = create_cost_matrix_for(this)
    if (!cost_matrix) {
      console.log(`Room.cost_matrix() unexpectedly find null cost matrix from create_cost_matrix_for() ${this.name}`)
      return undefined
    }

    room_memory.cost_matrix = cost_matrix.serialize()
    cost_matrixes.set(this.name, cost_matrix)

    return cost_matrix
  }

  Room.prototype.owned_structures_not_found_error = function(structure_type: StructureConstant): void {
    console.log(`Room.owned_structures_not_found_error ${structure_type} ${room_link(this.name)}`)
  }

  Room.prototype.add_remote_harvester = function(from: StructureStorage, carrier_max: number, opts?: {dry_run?: boolean, memory_only?: boolean}): string | null {
    opts = opts || {}
    const dry_run = !(opts.dry_run == false)

    console.log(`Room.add_remote_harvester dry_run: ${dry_run}`)

    const room = this as Room

    if (!from) {
      console.log(`Room.add_remote_harvester from cannot be null ${room.name}`)
      return null
    }
    if (!room.sources || (room.sources.length == 0)) {
      console.log(`Room.add_remote_harvester no sources in room ${room.name}, ${room.sources}`)
      return null
    }

    const room_name = room.name
    const owner_room_name = from.room.name

    if (!opts.memory_only) {
      // --- Path
      const pathfinder_opts: FindPathOpts = {
        maxRooms: 0,
        maxOps: 10000,
        range: 1,
      }

      const path = from.room.findPath(from.pos, room.sources[0].pos, pathfinder_opts)

      if (!path || (path.length == 0)) {
        console.log(`Room.add_remote_harvester cannot find path from ${from.pos} to ${room.sources[0].pos}, ${room.name}`)
        return null
      }

      const last_pos = path[path.length - 1]
      const start_pos: {x: number, y: number} = {
        x: last_pos.x,
        y: last_pos.y,
      }

      if (start_pos.x == 0) {
        start_pos.x = 49
      }
      else if (start_pos.x == 49) {
        start_pos.x = 0
      }

      if (start_pos.y == 0) {
        start_pos.y = 49
      }
      else if (start_pos.y == 49) {
        start_pos.y = 0
      }

      const road_positions: RoomPosition[] = path.map((p) => {
        return new RoomPosition(p.x, p.y, owner_room_name)
      })

      const cost_matrix = room.remote_layout(start_pos.x, start_pos.y)
      if (!cost_matrix) {
        console.log(`Room.add_remote_harvester cannot create cost matrix ${room_link(room.name)}, start pos: (${start_pos.x}, ${start_pos.y})`)
        return null
      }

      const road_cost = 1
      const room_size = 50

      for (let i = 0; i < room_size; i++) {
        for (let j = 0; j < room_size; j++) {
          const cost = cost_matrix.get(i, j)

          if (cost > road_cost) {
            continue
          }

          road_positions.push(new RoomPosition(i, j, room_name))
        }
      }

      // -- Dry Run
      if (dry_run) {
        road_positions.forEach((pos) => {
          const r = Game.rooms[pos.roomName]
          if (!r) {
            return
          }

          r.visual.text(`x`, pos, {
            color: '#ff0000',
            align: 'center',
            font: '12px',
            opacity: 0.8,
          })
        })

        return null
      }

      // --- Place flags
      const time = Game.time

      road_positions.forEach((pos) => {
        const r = Game.rooms[pos.roomName]
        if (!r) {
          return
        }

        const name = UID(`Flag${time}`)
        // r.createFlag(pos, name, COLOR_BROWN, COLOR_BROWN)

        r.createConstructionSite(pos, STRUCTURE_ROAD)
      })

      const region_memory = Memory.regions[owner_room_name]
      if (region_memory) {
        if (!region_memory.rooms_need_to_be_defended) {
          region_memory.rooms_need_to_be_defended = []
        }
        region_memory.rooms_need_to_be_defended.push(room_name)
      }
      else {
        console.log(`Room.add_remote_harvester no region memory for ${owner_room_name}`)
      }
    }

    // --- Squad Memory
    let squad_name = `remote_harvester_${room.name.toLowerCase()}`

    while (Memory.squads[squad_name]) {
      squad_name = `${squad_name}_1`
    }

    const sources: {[index: string]: {container_id?: string}} = {}

    room.find(FIND_SOURCES).forEach((source) => {
      sources[source.id] = {}
    })

    const squad_memory: RemoteHarvesterSquadMemory = {
      name: squad_name,
      type: SquadType.REMOET_HARVESTER,
      owner_name: from.room.name,
      number_of_creeps: 0,
      stop_spawming: true,
      room_name: room.name,
      sources,
      room_contains_construction_sites: [],
      carrier_max,
      need_attacker: room.is_keeperroom,
      builder_max: room.is_keeperroom ? 5 : 3,
    }

    Memory.squads[squad_name] = squad_memory

    // Region Memory
    const region_memory = Memory.regions[owner_room_name]
    if (!room.is_keeperroom) {
      if (region_memory) {
        if (!region_memory.rooms_need_to_be_defended) {
          Memory.regions[owner_room_name].rooms_need_to_be_defended = []
        }

        Memory.regions[owner_room_name].rooms_need_to_be_defended!.push(room_name)
      }
      else {
        console.log(`Room.add_remote_harvester region memory ${owner_room_name} does not exist`)
      }
    }

    if (region_memory) {
      if (!region_memory.rooms_need_to_be_defended) {
        region_memory.rooms_need_to_be_defended = []
      }
      region_memory.rooms_need_to_be_defended.push(room_name)
    }
    else {
      console.log(`Room.add_remote_harvester no region memory for ${owner_room_name}`)
    }

    return squad_name
  }

  Room.prototype.remote_layout = function(x: number, y: number): CostMatrix | null {

    const room = this as Room
    const road_cost = 1

    const cost_matrix = new PathFinder.CostMatrix()
    cost_matrix.add_terrain(room)
    cost_matrix.add_normal_structures(room, {ignore_public_ramparts: true})

    const costCallback = (room_name: string): boolean | CostMatrix => {
      if ((room.name == room_name)) {
        return cost_matrix
      }
      return false
    }

    const pathfinder_opts: FindPathOpts = {
      maxRooms: 0,
      maxOps: 10000,
      range: 1,
      costCallback,
    }

    let result: CostMatrix | null = cost_matrix
    const from_pos = new RoomPosition(x, y, room.name)

    room.sources.forEach((source, index) => {
      const path = room.findPath(from_pos, source.pos, pathfinder_opts)
      if (!path || (path.length == 0)) {
        result = null
        console.log(`Room.remote_layout cannot find path for ${from_pos} to ${source.pos}, ${path}`)
        return
      }

      path.forEach((pos) => {
        cost_matrix.set(pos.x, pos.y, road_cost)
      })
    })

    cost_matrix.show(room, {colors: {1: '#ff0000'}})

    return result
  }

  Room.prototype.layout = function(center: {x: number, y: number}, opts?: RoomLayoutOpts): RoomLayout | null {
    const room = this as Room

    try {
      const layout = new RoomLayout(room, center)
      return layout

    } catch(e) {
      console.log(e)
      return null
    }
  }

  Room.prototype.test = function(from: Structure): void {
    const room = this as Room
    // const cost_matrix = room.remote_layout()

    const pathfinder_opts: FindPathOpts = {
      maxRooms: 0,
      maxOps: 10000,
      range: 1,
    }

    const path = from.room.findPath(from.pos, room.sources[0].pos, pathfinder_opts)

    if (!path || (path.length == 0)) {
      console.log(`TEST no path`)
      return
    }

    console.log(`TEST ${path.length} paths`)

    const last_pos = path[path.length - 1]
    const start_pos: {x: number, y: number} = {
      x: last_pos.x,
      y: last_pos.y,
    }

    if (start_pos.x == 0) {
      start_pos.x = 49
    }
    else if (start_pos.x == 49) {
      start_pos.x = 0
    }

    if (start_pos.y == 0) {
      start_pos.y = 49
    }
    else if (start_pos.y == 49) {
      start_pos.y = 0
    }

    console.log(`TEST start pos: (${start_pos.x}, ${start_pos.y})`)

    path.forEach((pos) => {
      room.visual.text(`■`, pos.x, pos.y, {
        color: '#ff0000',
        align: 'center',
        font: '12px',
        opacity: 0.8,
      })
    })
  }

  RoomVisual.prototype.multipleLinedText = function(text: string | string[], x: number, y: number, style?: TextStyle): void {
    if (!Memory.debug.show_visuals) {
      return
    }

    const lines = ((text as string).split) ? (text as string).split('\n') : text as string[]
    lines.forEach((line, index) => {
      this.text(line, x, y + index, style)
    })
  }

  for (const room_name in Game.rooms) {
    const room = Game.rooms[room_name]
    room.spawns = []
  }

  PathFinder.CostMatrix.prototype.add_terrain = function(room: Room): void {
    if (!room) {
      console.log(`CostMatrix.add_terrain room cannot be nil`)
      return
    }

    let error_message: string | undefined

    const cost_matrix = this as CostMatrix
    const room_size = 50

    const road_cost = 1
    const plain_cost = 2
    const swamp_cost = plain_cost * 5
    const unwalkable_cost = 255

    for (let i = 0; i < room_size; i++) {
      for (let j = 0; j < room_size; j++) {
        const terrain = Game.map.getTerrainAt(i, j, room.name)
        let cost: number

        switch (terrain) {
          case 'plain':
            cost = plain_cost
            break

          case 'swamp':
            cost = swamp_cost
            break

          case 'wall':
            cost = unwalkable_cost
            break

          default: {
            cost = unwalkable_cost
            const message = `\n${room.name} ${i},${j} unknown terrain`
            error_message = !(!error_message) ? (error_message + message) : message
            break
          }
        }

        cost_matrix.set(i, j, cost)
      }
    }

    if (error_message) {
      error_message = `Room.create_costmatrix error ${room.name}\n`

      console.log(error_message)
    }
  }

  PathFinder.CostMatrix.prototype.add_normal_structures = function(room: Room, opts?: {ignore_public_ramparts?: boolean}): void {
    if (!room) {
      console.log(`CostMatrix.add_normal_structures room cannot be nil`)
      return
    }

    const options = opts || {}

    const cost_matrix = this as CostMatrix
    const unwalkable_cost = 255

    const walkable_structure_types: StructureConstant[] = [
      STRUCTURE_ROAD,
      STRUCTURE_CONTAINER,
    ]

    room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        if (walkable_structure_types.indexOf(structure.structureType) >= 0) {
          return false
        }
        if (structure.structureType == STRUCTURE_RAMPART) {
          if (structure.my) {
            return false
          }
          if (structure.isPublic && options.ignore_public_ramparts) {
            return false
          }
          return true
        }
        return true
      }
    }).forEach((structure) => {
      cost_matrix.set(structure.pos.x, structure.pos.y, unwalkable_cost)
    })
  }

  PathFinder.CostMatrix.prototype.show = function(room: Room, opt?: {colors?: {[index: number]: string}}): void {
    opt = opt || {}
    const colors: {[index: number]: string} = opt.colors || {}

    if (!room) {
      console.log(`CostMatrix.show room cannot be nil`)
      return
    }

    const cost_matrix = this as CostMatrix
    const room_size = 50

    for (let i = 0; i < room_size; i++) {
      for (let j = 0; j < room_size; j++) {
        const cost = cost_matrix.get(i, j)
        const color = colors[cost] || '#ffffff'

        room.visual.text(`${cost}`, i, j, {
          color,
          align: 'center',
          font: '12px',
          opacity: 0.8,
        })
      }
    }
  }
}

function create_cost_matrix_for(room: Room): CostMatrix {
  console.log(`${room_link(room.name)} create costmatrix`)

  let error_message: string | undefined

  let cost_matrix: CostMatrix = new PathFinder.CostMatrix;
  const margin = 5
  const room_size = 50

  const road_cost = 1
  const plain_cost = 2
  const swamp_cost = plain_cost * 5
  const unwalkable_cost = 255

  const hostile_cost = 12
  const edge_hostile_cost = 3
  const near_edge_hostile_cost = 5

  const is_edge = (x: number, y: number) => {
    if ((x == 0) || (x == 49)) {
      return true
    }
    if ((y == 0) || (y == 49)) {
      return true
    }
    return false
  }

  const is_near_edge = (x: number, y: number) => {
    if ((x == 1) || (x == 48)) {
      return true
    }
    if ((y == 1) || (y == 48)) {
      return true
    }
    return false
  }

  const terrains: Terrain[][] = []

  for (let i = 0; i < room_size; i++) {
    terrains.push([])

    for (let j = 0; j < room_size; j++) {
      const terrain = Game.map.getTerrainAt(i, j, room.name)
      let cost: number
      terrains[i].push(terrain)

      switch (terrain) {
        case 'plain':
          cost = plain_cost
          break

        case 'swamp':
          cost = swamp_cost
          break

        case 'wall':
          cost = unwalkable_cost
          break

        default: {
          cost = unwalkable_cost
          const message = `\n${room.name} ${i},${j} unknown terrain`
          error_message = !(!error_message) ? (error_message + message) : message
          break
        }
      }

      cost_matrix.set(i, j, cost)
    }
  }

  room.find(FIND_STRUCTURES).filter((structure: Structure) => {
    return structure.structureType == STRUCTURE_ROAD
  }).forEach((structure: Structure) => {
    cost_matrix.set(structure.pos.x, structure.pos.y, road_cost)
  })

  const set_hostile_cost = (obj: {pos: RoomPosition}) => {
    for (let i = (obj.pos.x - margin); i <= (obj.pos.x + margin); i++) {
      if ((i < 0) || (i > 49)) {
        continue
      }

      for (let j = (obj.pos.y - margin); j <= (obj.pos.y + margin); j++) {
        if ((j < 0) || (j > 49)) {
          continue
        }
        if (cost_matrix.get(i, j) == unwalkable_cost) {
          continue
        }

        let cost = hostile_cost + (margin - obj.pos.getRangeTo(i, j))

        if (is_edge(i, j)) {
          cost = edge_hostile_cost
        }
        else if (is_near_edge(i, j)) {
          cost = near_edge_hostile_cost
        }

        const terrain = terrains[i][j]
        if (terrain) {
          if (terrain == 'swamp') {
            cost += 3
          }
        }
        else {
          console.log(`create_cost_matrix_for unexpectedly null terrain at (${i}, ${j}) ${room.name}`)
        }

        cost_matrix.set(i, j, cost)
      }
    }
  }

  room.find(FIND_STRUCTURES).filter((structure: Structure) => {
    return structure.structureType == STRUCTURE_KEEPER_LAIR
  }).forEach(set_hostile_cost)

  room.find(FIND_SOURCES).forEach(set_hostile_cost)
  room.find(FIND_MINERALS).forEach(set_hostile_cost)

  if (error_message) {
    error_message = `Room.create_costmatrix error ${room.name}\n`

    console.log(error_message)
    Game.notify(error_message)
  }

  return cost_matrix
}
