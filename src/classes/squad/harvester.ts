import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export interface HarvesterSquadMemory extends SquadMemory {
  readonly source_id: string
  readonly room_name: string
}

export class HarvesterSquad extends Squad {
  private resource_type: ResourceConstant | undefined
  private harvesters: Creep[]
  private carriers: Creep[]
  private source: Source | Mineral | undefined  // A source that the harvester harvests energy
  private store: StructureContainer | StructureLink | undefined // A store that the harvester stores energy
  private container: StructureContainer | StructureLink | undefined // A energy container that the carrier withdraws energy
  private destination_storage: StructureStorage | undefined

  private get needs_harvester(): boolean {
    if (this.source_info.room_name == 'W49S34') {
      const room = Game.rooms[this.source_info.room_name]
      if (room && (room.energyCapacityAvailable < 1200)) {
        return this.harvesters.length < 2
      }
    }
    return this.harvesters.length < 1
  }

  constructor(readonly name: string, readonly source_info: {id: string, room_name: string}, readonly destination: StructureContainer | StructureTerminal | StructureStorage | StructureLink | StructureSpawn, readonly energy_capacity: number) {
    super(name)

    this.destination_storage = this.destination as StructureStorage // @fixme:

    if ((this.source_info.room_name == 'W48S49') || (this.source_info.room_name == 'W47S49')) { // @fixme: temp code
      const destination = Game.getObjectById('5aeed7712e007b09769feb8f') as StructureLink // Link in W48S47 bottom right
      if (destination) {
        this.destination = destination
      }
    }
    else if ((this.source_info.room_name == 'W48S48')) { // @fixme: temp code
      const destination = Game.getObjectById('5afb8dffdea4db08d5fe3a1c') as StructureLink // Link in W48S47 bottom left
      if (destination) {
        this.destination = destination
      }
    }
    else if ((this.source_info.room_name == 'W49S46') || (this.source_info.room_name == 'W48S46')) {
      const destination = Game.getObjectById('5af1b738f859db1e994a9e02') as StructureLink // Link in W49S47 top
      if (destination) {
        this.destination = destination
      }
    }
    else if ((this.source_info.room_name == 'W49S49')) { // @fixme: temp code
      const destination = Game.getObjectById('5b1348599bf6fe5c1aeadba6') as StructureLink // Link in W49S48 bottom
      if (destination) {
        this.destination = destination
      }
    }
    else if (['W49S48'].indexOf(this.source_info.room_name) >= 0) {

      const target_room = Game.rooms['W49S48']
      if ((this.source_info.id != '59f19ff082100e1594f35c88') && target_room && target_room.storage) {
        this.destination = target_room.storage
      }
      else {
        const destination = Game.getObjectById('5af5ffea42aa150cf94d8d48') as StructureLink // Link in W49S47 bottom
        if (destination) {
          this.destination = destination
        }
      }
    }
    else if ((this.source_info.room_name == 'W51S29')) { // @fixme: temp code
      if (!this.destination) {
        const destination = Game.getObjectById('5b1bd48e9e3f4a3fbb6a9a28') as StructureContainer
        if (destination) {
          this.destination = destination
        }
      }
    }

    if (!this.destination) {
      console.log(`HarvesterSquad destination not specified ${this.name}`)
    }

    this.harvesters = []
    this.carriers = []

    this.creeps.forEach((creep, _) => {
      switch (creep.memory.type) {
        case CreepType.HARVESTER:
          this.harvesters.push(creep)
          break

        case CreepType.CARRIER:
          this.carriers.push(creep)
          break

        default:
          console.log(`Unexpected creep type ${creep.memory.type}, ${this.name}`)
          break
      }
    })

    this.get_sources()
  }

  private get_sources(): void {
    const source = Game.getObjectById(this.source_info.id) as Source | Mineral
    if (!source) {
      return
    }
    this.source = source

    if (this.source_info.id == '59f1c0ce7d0b3d79de5f024d') {  // home oxgen
      this.resource_type = RESOURCE_OXYGEN
    // if ((this.source as Mineral).mineralType) {  // does not work (returns 0)
      // this.resource_type = (this.source as Mineral).mineralType
    }
    else if (this.source_info.id == '59f1c0ce7d0b3d79de5f01e1') {  // home2 utrium
      this.resource_type = RESOURCE_UTRIUM
    }
    else if (this.source_info.id == '59f1c0ce7d0b3d79de5f01e2') {  // home4 hydrogen
      this.resource_type = RESOURCE_HYDROGEN
    }
    else if (this.source_info.id == '59f1c0ce7d0b3d79de5f01d5') {  // home5 keanium
      this.resource_type = RESOURCE_KEANIUM
    }
    else {
      this.resource_type = RESOURCE_ENERGY
    }

    const store = this.source.pos.findInRange(FIND_STRUCTURES, 2, {
      filter: function(structure: Structure) {
        return structure.structureType == STRUCTURE_CONTAINER
      }
    })[0] as StructureContainer

    if (store) {
      this.store = store
      this.container = store
    }

    if (this.source_info.id == '59f19ff082100e1594f35c89') {
      const link = Game.getObjectById('5b0a5aaf7533293c116780a4') as StructureLink | undefined
      if (link && (link.energy < link.energyCapacity)) {
        this.store = link
      }
    }
    else if (this.source_info.id == '59f19ff082100e1594f35c83') {
      const link = Game.getObjectById('5b0ad3efc5612c1429e7e715') as StructureLink | undefined
      if (link && (link.energy < link.energyCapacity)) {
        this.store = link
      }
    }

    if ((this.source_info.id == '59f19fff82100e1594f35e06') && (this.carriers.length > 0)) {  // W48S47 top right
      const oxygen_container = Game.getObjectById('5af19724b0db053c306cbd30') as StructureContainer
      if (oxygen_container && (this.carriers.length > 0) && (this.carriers[0].carry.energy == 0) && ((oxygen_container.store[RESOURCE_OXYGEN] || 0) > 400)) {
        this.resource_type = RESOURCE_OXYGEN
        this.container = oxygen_container
      }
      else {
        const target = this.carriers[0].pos.findClosestByPath(FIND_STRUCTURES, { // Harvest from harvester containers and link
          filter: (structure) => {
            return ((structure.structureType == STRUCTURE_CONTAINER) && ((structure as StructureContainer).store.energy > 300))
              || ((structure.id == '5aee959afd02f942b0a03361') && ((structure as StructureLink).energy > 0)) // Link
          }
        }) as StructureContainer | StructureLink

        if (target) {
          this.container = target
        }
      }
      if (!oxygen_container) {
        const message = `HarvesterSquad oxygen_container in ${this.source_info.room_name} not found`
        console.log(message)
        Game.notify(message)
      }
    }
    else if ((this.source_info.id == '59f19ff082100e1594f35c84') && (this.carriers.length > 0)) { // W49S47 top right
      const utrium_container = Game.getObjectById('5af6018e4ce5d64c9cc2b0f3') as StructureContainer
      if (utrium_container && (this.carriers.length > 0) && (this.carriers[0].carry.energy == 0) && ((utrium_container.store[RESOURCE_UTRIUM] || 0) > 400)) {
        this.resource_type = RESOURCE_UTRIUM
        this.container = utrium_container
      }
      else {
        const target = this.carriers[0].pos.findClosestByPath(FIND_STRUCTURES, { // Harvest from harvester containers and link
          filter: (structure) => {
            return ((structure.structureType == STRUCTURE_CONTAINER) && ((structure as StructureContainer).store.energy > 600))
              || ((structure.id == '5af1900395fe4569eddba9da') && ((structure as StructureLink).energy > 0)) // link
          }
        }) as StructureContainer | StructureLink

        if (target) {
          this.container = target
        }
      }

      if (!utrium_container) {
        const message = `HarvesterSquad utrium_container in ${this.source_info.room_name} not found`
        console.log(message)
        Game.notify(message)
      }
    }
    // else if ((this.source_info.id == '59f19ff082100e1594f35c84') && (this.carriers.length > 0)) {  // W49S47 right
    //   const target = this.carriers[0].pos.findClosestByPath(FIND_STRUCTURES, { // Harvest from harvester containers and link
    //     filter: (structure) => {
    //       return ((structure.structureType == STRUCTURE_CONTAINER) && ((structure as StructureContainer).store.energy > 300))
    //         || ((structure.id == '5af1900395fe4569eddba9da') && ((structure as StructureLink).energy > 0)) // link
    //     }
    //   }) as StructureContainer | StructureLink

    //   if (target) {
    //     this.container = target
    //     console.log(`FUGA`)
    //   }
    // }
    else if ((this.source_info.id == '59f19fff82100e1594f35dec') && (this.carriers.length > 0)) {  // W48S39 left
      const target = this.carriers[0].pos.findClosestByPath(FIND_STRUCTURES, { // Harvest from harvester containers and link
        filter: (structure) => {
          return ((structure.structureType == STRUCTURE_CONTAINER) && ((structure as StructureContainer).store.energy > 300))
        }
      }) as StructureContainer | StructureLink

      if (target) {
        this.container = target
      }
    }
    else if ((this.source_info.id == '59f1a01e82100e1594f36174') && (this.carriers.length > 0)) {  // W46S33 bottom left
      const target = this.carriers[0].pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return ((structure.structureType == STRUCTURE_CONTAINER) && ((structure as StructureContainer).store.energy > 300))
        }
      }) as StructureContainer | StructureLink

      if (target) {
        this.container = target
      }
    }
    // else if ((this.source_info.id == '59f19fd382100e1594f35a4c') && (this.carriers.length > 0)) {  // W51S29 bottom right
    //   const target = this.carriers[0].pos.findClosestByPath(FIND_STRUCTURES, {
    //     filter: (structure) => {
    //       return ((structure.structureType == STRUCTURE_CONTAINER) && ((structure as StructureContainer).store.energy > 400))
    //         && (structure.id != this.destination.id)
    //     }
    //   }) as StructureContainer | StructureLink

    //   if (target) {
    //     this.container = target
    //   }
    // }
  }

  public get type(): SquadType {
    return SquadType.HARVESTER
  }

  public static generateNewName(): string {
    return UID(SquadType.HARVESTER)
  }

  public generateNewName(): string {
    return HarvesterSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    if (this.energy_capacity < 550) {
      return SpawnPriority.NONE
    }

    if (this.needs_harvester) {
      const room = Game.rooms[this.source_info.room_name]

      if (room && room.heavyly_attacked && (this.resource_type != RESOURCE_ENERGY)) {
        return SpawnPriority.NONE
      }

      // Extactorがない場合の処理
      // if (this.source_info.id == '59f1c0cf7d0b3d79de5f0392') {
      //   if (!room || room.heavyly_attacked) {
      //     return SpawnPriority.NONE
      //   }
      //   else if (!Game.getObjectById('5b04ba4ed36ad43822b2ccfe')) {
      //     return SpawnPriority.NONE
      //   }

      //   const position = RoomPosition(42, 13, this.source_info.room_name)
      //   const extractor = position.findInRange(FIND_STRUCTURES, 1, {
      //     filter: (structure: AnyStructure) => {
      //       return (structure.structureType == STRUCTURE_EXTRACTOR)
      //     }
      //   })

      //   if (!extractor) {
      //     return SpawnPriority.NONE
      //   }
      // }

      const source = Game.getObjectById(this.source_info.id) as Source | Mineral
      // Using (source as Mineral).mineralType because (source as Mineral).mineralAmount when it's 0 value, it's considered as false
      if (room && (source as Mineral).mineralType && ((source as Mineral).mineralAmount == 0) && ((source.ticksToRegeneration || 0) > 100)) {
        return SpawnPriority.NONE
      }
      return SpawnPriority.HIGH
    }

    let number_of_carriers = 1

    if (this.destination && (this.destination.room.name != this.source_info.room_name)) {
      number_of_carriers = 2
    }

    const rooms_needs_one_carriers = [ // @fixme: temp code
      'W48S48', // Close to link
      // 'W47S48', // Close to link
    ]

    if (rooms_needs_one_carriers.indexOf(this.source_info.room_name) >= 0) {
      number_of_carriers = 1
    }
    else if (this.source_info.id == '59f1a00e82100e1594f35f85') { // W47S48 top right
      number_of_carriers = 1
    }
    else if (this.source_info.id == '59f1a00e82100e1594f35f82') { // W47S47
      number_of_carriers = 2
    }
    else if (this.source_info.id == '59f19ff082100e1594f35c83') {  // top left of W49S47
      number_of_carriers = 0
    }
    else if (this.source_info.id == '59f19fff82100e1594f35e08') {  // W48S47 center
      number_of_carriers = 0
    }
    else if (this.source_info.id == '59f1c0ce7d0b3d79de5f024d') {  // W48S47 oxygen
      number_of_carriers = 0
    }
    else if (this.source_info.id == '59f1c0ce7d0b3d79de5f01e1') {  // W49S47 utrium
      number_of_carriers = 0
    }
    else if (this.source_info.id == '59f1c0ce7d0b3d79de5f01e2') {  // W49S48 hydrogen
      number_of_carriers = 1
    }
    else if (this.source_info.id == '59f19fff82100e1594f35ded') { // W48S39
      number_of_carriers = 0
    }
    else if (this.source_info.id == '59f19ff082100e1594f35c89') { // W49S48 bottom left
      number_of_carriers = 0
    }
    else if (this.source_info.id == '59f19ff082100e1594f35c88') { // W49S48 right
      number_of_carriers = 1
    }
    else if (this.source_info.id == '59f1a01e82100e1594f36173') { // W46S33 center
      number_of_carriers = 0
    }
    else if (this.source_info.id == '59f19ff082100e1594f35c8b') { // W49S49
      number_of_carriers = 1
    }
    else if (this.source_info.id == '59f19fd382100e1594f35a4b') { // W51S29 center
      number_of_carriers = 1
    }

    if (this.source_info.room_name == 'W47S49') {
      number_of_carriers = 3
    }
    else if (this.source_info.room_name == 'W48S49') {
      number_of_carriers = 3
    }
    else if (this.source_info.room_name == 'W49S34') {
      number_of_carriers = 1
    }

    if ((this.store) && (this.carriers.length < number_of_carriers)) {
      return SpawnPriority.NORMAL
    }
    return SpawnPriority.NONE
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    if (this.needs_harvester) {
      if (this.resource_type && (this.resource_type != RESOURCE_ENERGY)) {
        capacity = Math.min(capacity, 2300)

        const energy_unit = 250
        const energyNeeded = (Math.floor((capacity - 150) / energy_unit) * energy_unit)
        return energyAvailable >= energyNeeded
      }

      const energy_unit = 550
      const energy_needed = Math.min((Math.floor(capacity / energy_unit) * energy_unit), energy_unit * 2)
      return energyAvailable >= energy_needed
    }
    else {
      const energy_unit = 100
      const energy_needed = Math.min((Math.floor(capacity / energy_unit) * energy_unit), 1200)

      return energyAvailable >= energy_needed
    }
  }

  // --
  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    if (this.needs_harvester) {
      if (this.resource_type && (this.resource_type != RESOURCE_ENERGY)) {
        this.addMineralHarvester(energyAvailable, spawnFunc)
      }
      else {
        this.addHarvester(energyAvailable, spawnFunc)
      }
    }
    else {
      this.addCarrier(energyAvailable, spawnFunc)
    }
  }

  public run(): void {
    this.harvest()
    this.carry()
  }

  public description(): string {
    return `${super.description()}, ${this.source_info.room_name}`
  }

  // Private
  private addHarvester(energyAvailable: number, spawnFunc: SpawnFunction): void {
    const body_unit: BodyPartConstant[] = [WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE]
    const energy_unit = 550

    const name = this.generateNewName()
    let body: BodyPartConstant[] = body_unit
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.HARVESTER,
      let_thy_die: true,
    }

    if (energyAvailable >= (energy_unit * 2)) {
      body = body.concat(body_unit)
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  private addCarrier(energyAvailable: number, spawnFunc: SpawnFunction): void {
    const body_unit: BodyPartConstant[] = [CARRY, MOVE]
    const energy_unit = 100
    let let_thy_die = false

    if (this.source_info.room_name == 'W49S34') {
      if (this.source_info.id != '59f1c0ce7d0b3d79de5f01d5') {  // Keanium
        let_thy_die = true
      }
    }
    else if (this.source_info.id == '59f1a01e82100e1594f36174') {
      let_thy_die = true
    }

    const name = this.generateNewName()
    let body: BodyPartConstant[] = []
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.CARRIER,
      let_thy_die: let_thy_die,
    }

    let max_energy = 1200
    if (this.source_info.id == '59f19fff82100e1594f35dec') {
      max_energy = 600
    }
    else if (this.source_info.id = '59f19fee82100e1594f35c5b') {  // W49S34 bottom
      max_energy = 1600
    }
    else if (this.source_info.id = '59f19ff082100e1594f35c8b') {  // W49S49
      max_energy = 1600
    }

    energyAvailable = Math.min(energyAvailable, max_energy)

    while (energyAvailable >= energy_unit) {
      body = body.concat(body_unit)
      energyAvailable -= energy_unit
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  private addMineralHarvester(energyAvailable: number, spawnFunc: SpawnFunction): void {
    // capacity: 2300
    // 8 units, 2C, 16W, 9M

    energyAvailable = Math.min(energyAvailable, 2300)

    const move: BodyPartConstant[] = [MOVE]
    const work: BodyPartConstant[] = [WORK, WORK]
    const energy_unit = 250

    energyAvailable -= 150
    const header: BodyPartConstant[] = [CARRY, CARRY]
    let body: BodyPartConstant[] = [MOVE]
    const name = this.generateNewName()
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.HARVESTER,
      let_thy_die: true,
    }

    while (energyAvailable >= energy_unit) {
      body = move.concat(body)
      body = body.concat(work)
      energyAvailable -= energy_unit
    }
    body = header.concat(body)

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  private harvest(): void {
    this.harvesters.forEach((harvester) => {
      const needs_renew = !harvester.memory.let_thy_die && ((harvester.memory.status == CreepStatus.WAITING_FOR_RENEW) || ((harvester.ticksToLive || 0) < 300))

      if (needs_renew) {
        if ((harvester.room.spawns.length > 0) && ((harvester.room.energyAvailable > 40) || ((harvester.ticksToLive || 0) < 500)) && !harvester.room.spawns[0].spawning) {
          harvester.goToRenew(harvester.room.spawns[0])
          return
        }
        else if (harvester.memory.status == CreepStatus.WAITING_FOR_RENEW) {
          harvester.memory.status = CreepStatus.HARVEST
        }
      }

      if ((harvester.memory.status == CreepStatus.NONE) || ((harvester.carry[this.resource_type!] || 0) == 0)) {
        harvester.memory.status = CreepStatus.HARVEST
      }

      // Harvest
      let has_capacity = false
      if (!this.store) {
        // Does nothing
      }
      else if (this.resource_type && (this.store as StructureContainer).store) {
        const capacity = (this.store as StructureContainer).storeCapacity
        const energy_amount = (this.store as StructureContainer).store[this.resource_type!] || 0
        has_capacity = (energy_amount < capacity)
      }
      else if ((this.store as StructureLink).energy) {
        const capacity = (this.store as StructureLink).energyCapacity
        const energy_amount = (this.store as StructureLink).energy
        has_capacity = (energy_amount < capacity)
      }

      if ((harvester.memory.status == CreepStatus.HARVEST) && ((harvester.carry[this.resource_type!] || 0) == 0) && this.store && has_capacity) {
        const objects = harvester.room.lookAt(harvester)
        const dropped_object = objects.filter((obj) => {
          return (obj.type == 'resource')
            && ((obj.resource!.resourceType == this.resource_type))
        })[0]

        if (dropped_object) {
          const energy = dropped_object.resource!
          const pickup_result = harvester.pickup(energy)
          switch (pickup_result) {
            case OK:
            case ERR_FULL:
              break

            default:
              console.log(`HarvesterSquad.harvest() unexpected pickup result: ${pickup_result}, ${harvester.name}, ${this.name}`)
              break
          }
        }
        else if (this.container && this.store && (this.container.id != this.store.id) && (this.container.structureType == STRUCTURE_CONTAINER) && (this.container.store.energy > 0)) {
          if (harvester.withdraw(this.container, RESOURCE_ENERGY) == OK) {
            return
          }
        }
      }

      const carrying_energy = harvester.carry[this.resource_type!] || 0
      if ((harvester.memory.status == CreepStatus.HARVEST) && (carrying_energy > 0) && ((carrying_energy == harvester.carryCapacity) || ((harvester.ticksToLive || 0) < 5))) {
        harvester.memory.status = CreepStatus.CHARGE
      }

      if (harvester.memory.status == CreepStatus.HARVEST) {
        if (this.source) {
          if (harvester.harvest(this.source!) == ERR_NOT_IN_RANGE) {
            const ignoreCreeps = ((Game.time % 3) == 0) ? false : harvester.pos.getRangeTo(this.source!) <= 2  // If the blocking creep is next to the source, ignore

            harvester.moveTo(this.source!, {
              ignoreCreeps: ignoreCreeps,
            })
            return
          }
        }
        else {
          harvester.moveToRoom(this.source_info.room_name)
          return
        }
      }

      // Charge
      if (harvester.memory.status == CreepStatus.CHARGE) {
        if (!this.store) {
          harvester.memory.status = CreepStatus.BUILD
        }
        else if ((this.resource_type == RESOURCE_ENERGY) && harvester.room.controller && harvester.room.controller.my && (this.store!.hits < (this.store!.hitsMax * 0.6))) {
          harvester.repair(this.store!)
          return
        }
        else if ((this.resource_type == RESOURCE_ENERGY) && (harvester.room.controller && !harvester.room.controller.my) && (this.store!.hits < this.store!.hitsMax)) {
          harvester.repair(this.store!)
          return
        }
        else {
          let store: StructureContainer | StructureLink | undefined = this.store

          const transfer_result = harvester.transfer(store, this.resource_type!)
          switch (transfer_result) {
            case ERR_NOT_IN_RANGE:
              harvester.moveTo(store)
              return

            case ERR_FULL:
              if (harvester.carry.energy > 0) {
                harvester.drop(RESOURCE_ENERGY) // To NOT drop minerals
              }
              break

            case OK:
            case ERR_BUSY:  // @fixme: The creep is still being spawned.
              break

            default:
              console.log(`HarvesterSquad.harvest() unexpected transfer result1: ${transfer_result}, ${this.resource_type}, ${harvester.name}, ${this.name}, ${this.source_info.room_name}`)
              break
          }
          harvester.memory.status = CreepStatus.HARVEST
          return
        }
      }

      // Build
      if (harvester.memory.status == CreepStatus.BUILD) {
        const target = harvester.pos.findInRange(FIND_CONSTRUCTION_SITES, 2)[0] as ConstructionSite

        if (target) {
          const result = harvester.build(target)
          if (result != OK) {
            console.log(`HarvesterSquad.harvest build failed ${result}, ${this.name}`)
            return
          }
        }
        else {
          if (this.source) {
            const x_diff = harvester.pos.x - this.source.pos.x
            const y_diff = harvester.pos.y - this.source.pos.y
            const pos = {
              x: harvester.pos.x + x_diff,
              y: harvester.pos.y + y_diff,
            }

            const result = harvester.room.createConstructionSite(pos.x, pos.y, STRUCTURE_CONTAINER)
            console.log(`HarvesterSquad place container on ${pos} at ${harvester.room.name}, ${this.name}`)
            harvester.memory.status = CreepStatus.HARVEST // @todo: more optimized way
            return
          }
          else {
            console.log(`HarvesterSquad.harvest no target source ${this.source_info.id}, ${this.name}, ${harvester.name} at ${harvester.pos}`)
            return
          }
        }
      }
    })
  }

  private carry(): void {
    this.carriers.forEach((creep) => {
      const needs_renew = !creep.memory.let_thy_die && ((creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || ((creep.ticksToLive || 0) < 300))

      if (needs_renew) {
        if ((creep.room.spawns.length > 0) && ((creep.room.energyAvailable > 40) || ((creep.ticksToLive || 0) < 500)) && !creep.room.spawns[0].spawning) {
          creep.goToRenew(creep.room.spawns[0])
          return
        }
        else if (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) {
          creep.memory.status = CreepStatus.HARVEST
        }
      }

      if (!creep.room.attacked && (creep.room.resourceful_tombstones.length > 0)) {
        const target = creep.room.resourceful_tombstones[0]
        const resource_amount = _.sum(target.store)
        if (resource_amount > 0) {
          const vacancy = creep.carryCapacity - _.sum(creep.carry)
          if (vacancy < resource_amount) {
            creep.drop(RESOURCE_ENERGY, resource_amount - vacancy)
          }

          let resource_type: ResourceConstant | undefined
          for (const type of Object.keys(target.store)) {
            resource_type = type as ResourceConstant
          }
          if (resource_type) {
            if (creep.withdraw(target, resource_type) == ERR_NOT_IN_RANGE) {
              creep.moveTo(target)
              creep.say(`${target.pos.x}, ${target.pos.y}`)
            }
            return
          }
        }
        else if ((creep.ticksToLive || 0) < 300) {
          creep.memory.status = CreepStatus.CHARGE
        }
      }

      // if ((creep.memory.status == CreepStatus.NONE) || ((creep.carry[this.resource_type!] || 0) == 0)) { // If the resource is not energy, it should be in the controlled room so resource_type should also be provided
      if (creep.memory.status == CreepStatus.NONE) {
        creep.memory.status = CreepStatus.HARVEST
      }

      // Harvest
      if (creep.memory.status == CreepStatus.HARVEST) {
        if (_.sum(creep.carry) == creep.carryCapacity) {
          creep.memory.status = CreepStatus.CHARGE
        }
        else if (creep.room.attacked && (_.sum(creep.carry) > 0)) { // If there's no creep in the room, there's no way to know the room is under attack
          creep.say('RUN')
          creep.moveTo(this.destination)
          creep.memory.status = CreepStatus.CHARGE
          return
        }
        else if (this.container) {
          const withdraw_result = creep.withdraw(this.container!, this.resource_type!)
          if (withdraw_result == ERR_NOT_IN_RANGE) {
            creep.moveTo(this.container!, {
              // avoid: [new RoomPosition(this.source!.pos.x + 1, this.source!.pos.y + 1, this.source!.room.name)] // @fixme: temp code
            } as MoveToOpts)
          }
          else if ((withdraw_result == OK) && (this.container) && (this.container.structureType == STRUCTURE_LINK)) {
            // When the carrier withdrow from link, it should be located next to storage
            creep.memory.status = CreepStatus.CHARGE
            return // It needed to make this line work
          }
        }
        else {
          creep.moveToRoom(this.source_info.room_name)
          return
        }
      }

      // Charge
      if (creep.memory.status == CreepStatus.CHARGE) {
        const has_mineral = creep.carry.energy != _.sum(creep.carry)
        const destination = (has_mineral && !(!this.destination_storage)) ? this.destination_storage : this.destination

        let resource_type: ResourceConstant | undefined
        for (const type of Object.keys(creep.carry)) {
          if ((creep.carry[type as ResourceConstant] || 0) == 0) {
            continue
          }
          resource_type = type as ResourceConstant
        }

        if (resource_type) {
          const transfer_result = creep.transfer(destination, resource_type)
          switch (transfer_result) {
            case ERR_NOT_IN_RANGE:
              creep.moveTo(destination)
              if (has_mineral) {
                creep.say(`💎`)
              }
              break

            case ERR_FULL:
              if ((creep.carry[resource_type] || 0) <= 100) {
                creep.memory.status = CreepStatus.HARVEST
              }
              break

            case OK:
              break

            default:
              console.log(`HarvesterSquad.carry() unexpected transfer result: ${transfer_result}, ${resource_type}, ${creep.name}, ${this.name}, ${this.source_info.room_name}, ${destination}`)
              break
          }
        }
        else {
          creep.memory.status = CreepStatus.HARVEST
        }
      }
    })
  }
}
