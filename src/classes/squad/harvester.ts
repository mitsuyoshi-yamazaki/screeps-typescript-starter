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
  private store: StructureContainer | StructureLink | StructureStorage | undefined // A store that the harvester stores energy
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
      const destination = Game.getObjectById('5aef62f86627413133777bdf') as StructureStorage // Storage in W49S47
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

    const is_alive = (this.energy_capacity > 300)

    if (!this.destination && is_alive) {
      if (((Game.time + 3) % 7) == 0) {
        console.log(`HarvesterSquad destination not specified ${this.name}`)
      }
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
          console.log(`HarvesterSquad unexpected creep type ${creep.memory.type}, ${this.name}`)
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
    else if (this.source_info.id == '59f1c0cf7d0b3d79de5f02fd') { // W46S33 zynthium
      this.resource_type = RESOURCE_ZYNTHIUM
    }
    else if (this.source_info.id == '59f1c0ce7d0b3d79de5f0165') { // W51S29 lemergium
      this.resource_type = RESOURCE_LEMERGIUM
    }
    else if (this.source_info.id == '59f1c0cf7d0b3d79de5f037c') { // W44S7 Hydrogen
      this.resource_type = RESOURCE_HYDROGEN
    }
    else if (this.source_info.id == '59f1c0cf7d0b3d79de5f043e') { // W42N1 Catalyst
      this.resource_type = RESOURCE_CATALYST
    }
    else if (this.source_info.id == '59f1c0ce7d0b3d79de5f0228') { // W48S6 Hydrogen
      this.resource_type = RESOURCE_HYDROGEN
    }
    else if (this.source_info.id == '59f1c0ce7d0b3d79de5f028d') { // W47N2 Hydrogen
      this.resource_type = RESOURCE_HYDROGEN
    }
    else if (this.source_info.id == '59f1c0cf7d0b3d79de5f03d7') { // W43S5 Utrium
      this.resource_type = RESOURCE_UTRIUM
    }
    else if (this.source_info.id == '59f1c0cf7d0b3d79de5f03ce') { // W43N5 Zynthium
      this.resource_type = RESOURCE_ZYNTHIUM
    }
    else if (this.source_info.id == '59f1c0ce7d0b3d79de5f0219') { // W48N11 Oxygen
      this.resource_type = RESOURCE_OXYGEN
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
    else if ((this.source_info.id == '59f19fd382100e1594f35a4b')) { // @fixme: temp code
      const link = Game.getObjectById('5b25ad0900c9b15f092dfa9c') as StructureLink | undefined // Link in W51S29 left
      if (link) {
        this.store = link
      }
    }
    else if ((this.source_info.id == '59f19fd382100e1594f35a4c')) { // @fixme: temp code
      const link = Game.getObjectById('5b1f067fd3624f4f7b40c05d') as StructureLink | undefined // Link in W51S29 bottom
      if (link) {
        this.store = link
      }
    }
    else if (this.source_info.id == '59f1a03882100e1594f36569') { // W44S7
      const link = Game.getObjectById('5b2e84e6a426a6424452130c') as StructureLink | undefined
      if (link && (link.energy < link.energyCapacity)) {
        this.store = link
      }
    }
    else if (this.source_info.id == '59f1a05882100e1594f368a8') { // W42N1
      const link = Game.getObjectById('5b306e8992a8bd27bf54c8ac') as StructureLink | undefined
      if (link && (link.energy < link.energyCapacity)) {
        this.store = link
      }
    }
    else if (this.source_info.id == '59f1a04682100e1594f36736') { // W43S5
      const link = Game.getObjectById('5b318a5682c736408cf8a54e') as StructureLink | undefined
      if (link && (link.energy < link.energyCapacity)) {
        this.store = link
      }
    }
    else if (this.source_info.id == '59f1a00882100e1594f35eeb') { // W47N2
      const link = Game.getObjectById('5b334e132d6e4e7d3f58a2ea') as StructureLink | undefined
      if (link && (link.energy < link.energyCapacity)) {
        this.store = link
      }
    }
    else if (this.source_info.id == '59f1a04482100e1594f36715') { // W43N5
      const storage = Game.getObjectById('5b33832c9ea3e436baf9f9c1') as StructureStorage | undefined
      if (storage) {
        this.store = storage
      }
    }
    else if (this.source_info.id == '59f1a05882100e1594f368aa') { // W42N1 bottom
      const link = Game.getObjectById('5b34d57a244ab464e470dbe8') as StructureLink | undefined
      if (link) {
        this.store = link
      }
    }
    else if (this.source_info.id == '59f19ffa82100e1594f35d81') { // W48S6 top
      const link = Game.getObjectById('5b34eee144286f7b91f90f2e') as StructureLink | undefined
      if (link) {
        this.store = link
      }
    }
    else if (this.source_info.id == '59f19ffa82100e1594f35d82') { // W48S6 bottom
      const link = Game.getObjectById('5b34f78197be977d39dbf57e') as StructureLink | undefined
      if (link) {
        this.store = link
      }
    }
    else if (this.source_info.id == '59f1a00882100e1594f35eec') { // W48S6 bottom
      const link = Game.getObjectById('5b37bbbd6980fd26fd163797') as StructureLink | undefined
      if (link) {
        this.store = link
      }
    }
    else if (this.source_info.id == '59f1a04482100e1594f36714') { // W43N5 left
      const link = Game.getObjectById('5b3d93b2ff170f5958e795cd') as StructureLink | undefined
      if (link) {
        this.store = link
      }
    }
    else if (this.source_info.id == '59f19ff882100e1594f35d48') { // W48N11 left
      const link = Game.getObjectById('5b4a09a5931ad37d5f2cdfcd') as StructureLink | undefined
      if (link) {
        this.store = link
      }
    }
    else if (this.source_info.id == '59f19ff882100e1594f35d49') { // W48N11 right
      const link = Game.getObjectById('5b4a05902d96195eb3bc6e4a') as StructureLink | undefined
      if (link) {
        this.store = link
      }
    }
    else if (this.source_info.id == '59f1a03882100e1594f3656b') { // W44S7 bottom
      const link = Game.getObjectById('5b4886e633652d6850c4b543') as StructureLink | undefined
      if (link) {
        this.store = link
      }
    }


    // --
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
      const utrium_container = Game.getObjectById('5b26ef4ad307cc2f4ed53532') as StructureContainer
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
          if (structure.structureType != STRUCTURE_CONTAINER) {
            return false
          }
          if (structure.id == '59f1a01e82100e1594f36173') { // center
            return ((structure as StructureContainer).store.energy > 1000)
          }
          return ((structure as StructureContainer).store.energy > 300)
        }
      }) as StructureContainer | StructureLink

      if (target) {
        this.container = target
      }
    }
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
    const room = Game.rooms[this.source_info.room_name]

    if ((this.source_info.id == '59f19ff082100e1594f35c83') && room && room.attacked) {  // W49S48 top energy
      return SpawnPriority.NONE
    }
    // if (this.source_info.id == '59f1c0ce7d0b3d79de5f0165') {  // W51S29 Lemergium
    //   return SpawnPriority.NONE
    // }
    if (this.source_info.id == '59f1c0ce7d0b3d79de5f024d') {  // W48S47 Oxygen
      return SpawnPriority.NONE
    }
    if (this.source_info.id == '59f1c0ce7d0b3d79de5f01e1') {  // W49S47 Utrium
      return SpawnPriority.NONE
    }
    if (this.source_info.id == '59f1c0ce7d0b3d79de5f01e2') {  // W49S48 Hydrogen
      return SpawnPriority.NONE
    }

    if ((this.energy_capacity < 550) && (this.source_info.room_name != 'W47N2')) {
      return SpawnPriority.NONE
    }

    if (this.needs_harvester) {
      if (room && room.heavyly_attacked && (this.resource_type != RESOURCE_ENERGY)) {
        this.creeps.forEach((creep) => {
          creep.memory.let_thy_die = true
        })
        return SpawnPriority.NONE
      }

      if ((this.source_info.id == '59f1c0cf7d0b3d79de5f02fd')) {  // W46S33 Zynthium
        if (!Game.getObjectById('5b2121da4e899551a6595ae7') || !Game.getObjectById('5b209ad0b8917c5f23cde3fa')) {
          const message = `W46S33 missing zynthium extractor or container`
          console.log(message)
          if ((Game.time % 51) == 0) {
            Game.notify(message)
          }
        }
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
        if ((Game.time % 23) == 5) {
          this.creeps.forEach((creep) => {
            creep.memory.let_thy_die = true
          })
        }
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
      number_of_carriers = 2
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
    else if (this.source_info.id == '59f19fd382100e1594f35a4b') { // W51S29 left
      number_of_carriers = 0
    }
    else if (this.source_info.id == '59f19fd382100e1594f35a4c') { // W51S29 bottom
      number_of_carriers = 0
    }
    else if (this.source_info.id == '59f1a01e82100e1594f36174') { // W46S33 bottom left
      number_of_carriers = 2
    }
    else if (this.source_info.id == '59f1a04482100e1594f36715') { // W43N5 right
      number_of_carriers = 0
    }
    else if (this.source_info.id == '59f1a03882100e1594f36569') { // W44S7 top
      number_of_carriers = 0
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
    else if ((this.source_info.room_name == 'W43S5')) {
      if (room && room.storage) {

      }
      else {
        number_of_carriers = 0
      }
    }

    if (this.store && (this.store.structureType == STRUCTURE_LINK)) {
      number_of_carriers = 0
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
      const energy_needed = Math.min((Math.floor(capacity / energy_unit) * energy_unit), energy_unit * 2) // (energy_unit * 2) is the maximum
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
    const room = Game.rooms[this.source_info.room_name]
    const minimum_body = !(!room) && !(!room.controller) && !(!room.controller.my) && (room.controller.level > 3)

    const body_unit: BodyPartConstant[] = [WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE]
    const energy_unit = 550

    const name = this.generateNewName()
    let body: BodyPartConstant[] = body_unit
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.HARVESTER,
      should_notify_attack: false,
      let_thy_die: true,
    }

    if (minimum_body && (energyAvailable >= 850)) {
      body = [
        WORK, WORK, WORK,
        WORK, WORK, WORK,
        CARRY, CARRY,
        MOVE, MOVE, MOVE,
      ]
    }
    else {
      if (energyAvailable >= (energy_unit * 2)) {  // (energy_unit * 2) is the maximum
        body = body.concat(body_unit)
      }
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  private addCarrier(energyAvailable: number, spawnFunc: SpawnFunction): void {
    const room = Game.rooms[this.source_info.room_name]
    const minimum_body = !(!room) && !(!room.controller) && !(!room.controller.my) && (room.controller.level > 3)

    const body_unit: BodyPartConstant[] = minimum_body ? [CARRY, CARRY, MOVE] : [CARRY, MOVE]
    const energy_unit = minimum_body ? 150 : 100
    let let_thy_die = (energyAvailable >= 1200) ? false : true

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
      should_notify_attack: false,
      let_thy_die: let_thy_die,
    }

    let max_energy = minimum_body ? 900 : 1200
    // if (this.source_info.id == '59f19fff82100e1594f35dec') {
    //   max_energy = 600
    // }
    // else if (this.source_info.id = '59f19fee82100e1594f35c5b') {  // W49S34 bottom
    //   max_energy = 1600
    // }
    // else if (this.source_info.id = '59f19ff082100e1594f35c8b') {  // W49S49
    //   max_energy = 1600
    // }
    // else if (this.source_info.room_name == 'W51S29') {
    //   max_energy = 800
    // }

    if (this.source_info.id == '59f1a03882100e1594f3656b') { // W44S7 bottom
      max_energy = 900
    }
    else if (this.source_info.id == '59f1a04482100e1594f36714') { // W43N5 left
      max_energy = 900
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
      should_notify_attack: false,
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
    this.harvesters.forEach((creep) => {
      runHarvester(creep, this.source_info.room_name, this.source, this.store, this.container, {
        resource_type: this.resource_type
      })
    })
  }


  private carry(): void {
    this.carriers.forEach((creep) => {
      if (creep.spawning) {
        return
      }

      if (this.store && (this.store.structureType == STRUCTURE_LINK)) {
        creep.memory.let_thy_die = true
      }

      if ((creep.memory.status == CreepStatus.WAITING_FOR_RENEW) && ((creep.ticksToLive || 0) > 1400)) {
        creep.memory.status = CreepStatus.HARVEST
      }

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

      const carry_amount = _.sum(creep.carry)

      if (!creep.room.attacked && (creep.room.resourceful_tombstones.length > 0) && ((carry_amount - creep.carry.energy) < (creep.carryCapacity - 100))) {
        const target = creep.room.resourceful_tombstones[0]
        const resource_amount = _.sum(target.store) - target.store.energy
        if (resource_amount > 0) {
          const vacancy = creep.carryCapacity - carry_amount
          if (vacancy < resource_amount) {
            creep.drop(RESOURCE_ENERGY, resource_amount - vacancy)
          }

          const withdraw_result = creep.withdrawResources(target, {exclude: [RESOURCE_ENERGY]})
          if (withdraw_result == ERR_NOT_IN_RANGE) {
            creep.moveTo(target)
            creep.say(`${target.pos.x}, ${target.pos.y}`)
          }
          else if (withdraw_result != OK) {
            creep.say(`E${withdraw_result}`)
          }
          return
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
        if (carry_amount == creep.carryCapacity) {
          creep.memory.status = CreepStatus.CHARGE
        }
        else if ((carry_amount > 0) && (this.harvesters.length == 0)) {
          creep.memory.status = CreepStatus.CHARGE
        }
        else if (creep.room.attacked && (_.sum(creep.carry) > 0) && ((!creep.room.controller || !creep.room.controller.my))) { // If there's no creep in the room, there's no way to know the room is under attack
          creep.say('RUN')
          creep.moveTo(this.destination)
          creep.memory.status = CreepStatus.CHARGE
          return
        }
        else if (this.container) {
          const withdraw_result = creep.withdraw(this.container!, this.resource_type!)
          if (withdraw_result == ERR_NOT_IN_RANGE) {
            let ops: MoveToOpts = {}
            if ((this.source_info.id == '59f1a03882100e1594f36569')) {  // W44S7
              ops = {
                avoid: [new RoomPosition(13, 13, 'W44S7')] // @fixme: temp code
              }
            }
            creep.moveTo(this.container!, ops)
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
        if ((this.source_info.id == '59f1a03882100e1594f36569') && !this.destination) {  // W44S7
          const x = 20
          const y = 40
          if ((creep.pos.x == x) && (creep.pos.y == y)) {
            creep.dropResources()
            creep.memory.status = CreepStatus.HARVEST
          }
          else {
            creep.moveTo(x, y)
          }
          return
        }
        else if ((this.source_info.room_name == 'W42N1') && !this.destination) {  // W42N1
          const x = 23
          const y = 27
          if ((creep.pos.x == x) && (creep.pos.y == y)) {
            creep.dropResources()
            creep.memory.status = CreepStatus.HARVEST
          }
          else {
            creep.moveTo(x, y)
          }
          return
        }
        else if ((this.source_info.room_name == 'W47N2') && !this.destination) {
          const x = 15
          const y = 11
          if ((creep.pos.x == x) && (creep.pos.y == y)) {
            creep.drop(RESOURCE_ENERGY)
            creep.memory.status = CreepStatus.HARVEST
          }
          else {
            creep.moveTo(x, y)
          }
          return
        }

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

export interface RunHarvesterOptions {
  resource_type?: ResourceConstant
}

export function runHarvester(creep: Creep, room_name: string, source: Source | Mineral | undefined, store: StructureContainer | StructureLink | StructureStorage | undefined, container: StructureContainer | StructureLink | undefined, opt?: RunHarvesterOptions): void {
  if (creep.spawning) {
    return
  }

  const options = opt || {}
  const resource_type = options.resource_type || RESOURCE_ENERGY

  if (!options.resource_type) {
    options.resource_type = resource_type
  }

  if (creep.getActiveBodyparts(CARRY) == 0) {
    if (creep.room.is_keeperroom && (creep.moveToRoom(room_name) == ActionResult.IN_PROGRESS)) {
      return
    }
    if (source) {
      if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
        const ignoreCreeps = ((Game.time % 3) == 0) ? false : creep.pos.getRangeTo(source) <= 2  // If the blocking creep is next to the source, ignore

        creep.moveTo(source, {
          ignoreCreeps: ignoreCreeps,
        })
        return
      }
    }
    else {
      creep.moveToRoom(room_name)
      return
    }
    return
  }

  if (((creep.ticksToLive || 0) < 3) && store && (store.structureType != STRUCTURE_LINK)) {
    creep.transferResources(store)
  }

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

  if ((creep.memory.status == CreepStatus.NONE) || ((creep.carry[resource_type] || 0) == 0)) {
    creep.memory.status = CreepStatus.HARVEST
  }

  // Harvest
  let has_capacity = false
  if (!store) {
    // Does nothing
  }
  else if (resource_type && (store as StructureContainer).store) {
    const capacity = (store as StructureContainer).storeCapacity
    const energy_amount = _.sum((store as StructureContainer).store)
    has_capacity = (energy_amount < capacity)
  }
  else if (store.structureType == STRUCTURE_LINK) {
    const capacity = (store as StructureLink).energyCapacity
    const energy_amount = (store as StructureLink).energy
    has_capacity = (energy_amount < capacity)
  }

  if ((creep.memory.status == CreepStatus.HARVEST) && ((creep.carry[resource_type] || 0) == 0) && store && has_capacity) {
    if (source && (creep.pos.getRangeTo(source) <= 1)) {

      const dropped_object = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {
        filter: (resource: Resource) => {
          return (resource.resourceType == resource_type)
        }
      })[0]

      if (dropped_object) {
        const pickup_result = creep.pickup(dropped_object)
        switch (pickup_result) {
          case OK:
          case ERR_FULL:
            break

          default:
            console.log(`HarvesterSquad.harvest() unexpected pickup result: ${pickup_result}, ${creep.name}, ${creep.pos}, ${room_name}`)
            break
        }
        return
      }
    }

    if (container && store && (container.id != store.id) && (container.structureType == STRUCTURE_CONTAINER) && (container.store.energy > 0)) {
      if (creep.withdraw(container, RESOURCE_ENERGY) == OK) {
        return
      }
    }
  }

  const carrying_energy = creep.carry[resource_type] || 0
  if ((creep.memory.status == CreepStatus.HARVEST) && (carrying_energy > 0) && ((carrying_energy > (creep.carryCapacity - (creep.getActiveBodyparts(WORK) * HARVEST_POWER))) || ((creep.ticksToLive || 0) < 5))) {
    creep.memory.status = CreepStatus.CHARGE
  }

  if (creep.memory.status == CreepStatus.HARVEST) {
    if (creep.room.is_keeperroom && (creep.moveToRoom(room_name) == ActionResult.IN_PROGRESS)) {
      return
    }
    if (source) {
      if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
        const ignoreCreeps = ((Game.time % 3) == 0) ? false : creep.pos.getRangeTo(source) <= 2  // If the blocking creep is next to the source, ignore

        creep.moveTo(source, {
          ignoreCreeps: ignoreCreeps,
        })
        return
      }
    }
    else {
      creep.moveToRoom(room_name)
      return
    }
  }

  // Charge
  if (creep.memory.status == CreepStatus.CHARGE) {
    if (!store) {
      if (creep.memory.debug) {
        creep.say(`NO store`)
      }
      creep.memory.status = CreepStatus.BUILD
    }
    else if ((resource_type == RESOURCE_ENERGY) && creep.room.controller && creep.room.controller.my && (store.hits < (store.hitsMax * 0.6))) {
      creep.repair(store)
      return
    }
    else if ((resource_type == RESOURCE_ENERGY) && (store.hits < store.hitsMax)) {
      creep.repair(store)
      return
    }
    else {
      let local_store: StructureContainer | StructureLink | StructureStorage | undefined = store

      const transfer_result = creep.transfer(local_store, resource_type)
      switch (transfer_result) {
        case ERR_NOT_IN_RANGE:
        creep.moveTo(store)
          return

        case ERR_FULL:
          if (creep.carry.energy > 0) {
            creep.drop(RESOURCE_ENERGY) // To NOT drop minerals
          }
          break

        case OK:
        case ERR_BUSY:  // @fixme: The creep is still being spawned.
          break

        default:
          console.log(`HarvesterSquad.harvest() unexpected transfer result1: ${transfer_result}, ${resource_type}, ${creep.name}, ${creep.pos}, ${room_name}`)
          break
      }
      creep.memory.status = CreepStatus.HARVEST
      return
    }
  }

  // Build
  if (creep.memory.status == CreepStatus.BUILD) {
    const target = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 2)[0] as ConstructionSite

    if (target) {
      const result = creep.build(target)
      if (result != OK) {
        console.log(`HarvesterSquad.harvest build failed ${result}, ${creep.name}, ${creep.pos}, ${room_name}`)
        return
      }
    }
    else {
      if (source) {
        if (creep.pos.getRangeTo(source) == 1) {
          const x_diff = creep.pos.x - source.pos.x
          const y_diff = creep.pos.y - source.pos.y
          const pos = {
            x: creep.pos.x,// + x_diff,
            y: creep.pos.y,// + y_diff,
          }

          const result = creep.room.createConstructionSite(pos.x, pos.y, STRUCTURE_CONTAINER)
          console.log(`HarvesterSquad place container on ${pos.x}, ${pos.y} at ${creep.room.name}, ${room_name}`)
          creep.memory.status = CreepStatus.HARVEST // @todo: more optimized way
          return
        }
        else {
          creep.drop(RESOURCE_ENERGY)
          creep.memory.status = CreepStatus.HARVEST
          return
        }
      }
      else {
        console.log(`HarvesterSquad.harvest no target source ${creep.name} at ${creep.pos} ${room_name}`)
        return
      }
    }
  }
}
