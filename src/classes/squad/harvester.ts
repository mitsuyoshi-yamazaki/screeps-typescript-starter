import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export interface HarvesterSquadMemory extends SquadMemory {
  readonly source_id: string
  readonly room_name: string
}

export class HarvesterSquad extends Squad {
  private resource_type: ResourceConstant | undefined
  private harvester?: Creep
  private carriers: Creep[]
  private source: Source | Mineral | undefined  // A source that the harvester harvests energy
  private store: StructureContainer | undefined // A store that the harvester stores energy
  private container: StructureContainer | StructureLink | undefined // A energy container that the carrier withdraws energy

  constructor(readonly name: string, readonly source_info: {id: string, room_name: string}, readonly destination: StructureContainer | StructureStorage | StructureLink) {
    super(name)

    if ((this.source_info.room_name == 'W48S48') || (this.source_info.room_name == 'W47S48')) { // @fixme: temp code
      const destination = Game.getObjectById('5aeed7712e007b09769feb8f') as StructureLink // Link in W48S47
      if (destination) {
        this.destination = destination
      }
    }
    else if ((this.source_info.room_name == 'W49S46') || (this.source_info.room_name == 'W48S46')) {
      const destination = Game.getObjectById('5af1b738f859db1e994a9e02') as StructureLink // Link in W49S47
      if (destination) {
        this.destination = destination
      }
    }

    if (!destination) {
      console.log(`HarvesterSquad destination not specified ${this.name}`)
    }

    this.carriers = []

    this.creeps.forEach((creep, _) => {
      switch (creep.memory.type) {
        case CreepType.HARVESTER:
          this.harvester = creep
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
    else {
      this.resource_type = RESOURCE_ENERGY
    }

    const store = this.source.pos.findInRange(FIND_STRUCTURES, 2, {
      filter: function(structure: Structure) {
        return structure.structureType == STRUCTURE_CONTAINER
      }
    })[0] as StructureContainer

    if (!store) {
      return
    }
    this.store = store
    this.container = store

    if ((this.source_info.id == '59f19fff82100e1594f35e06') && (this.carriers.length > 0)) {  // W48S47 top right
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
    else if ((this.source_info.id == '59f1a03c82100e1594f36609') && (this.carriers.length > 0)) {  // W44S42 right
      const target = this.carriers[0].pos.findClosestByPath(FIND_STRUCTURES, { // Harvest from harvester containers and link
        filter: (structure) => {
          return ((structure.structureType == STRUCTURE_CONTAINER) && ((structure as StructureContainer).store.energy > 300))
            // || ((structure.id == '5aee959afd02f942b0a03361') && ((structure as StructureLink).energy > 0)) // No Link yet
        }
      }) as StructureContainer | StructureLink

      if (target) {
        this.container = target
      }
    }
    else if ((this.source_info.id == '59f19ff082100e1594f35c84') && (this.carriers.length > 0)) {  // W49S47 right
      const target = this.carriers[0].pos.findClosestByPath(FIND_STRUCTURES, { // Harvest from harvester containers and link
        filter: (structure) => {
          return ((structure.structureType == STRUCTURE_CONTAINER) && ((structure as StructureContainer).store.energy > 300))
            || ((structure.id == '5af1900395fe4569eddba9da') && ((structure as StructureLink).energy > 0)) // No Link yet
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
    if (!this.harvester) {
      return SpawnPriority.HIGH
    }

    let number_of_carriers = (this.destination.room.name == this.source_info.room_name) ? 1 : 2
    const rooms_needs_one_carriers = [ // @fixme: temp code
      'W48S48', // Close to link
      // 'W47S48', // Close to link
    ]

    if (rooms_needs_one_carriers.indexOf(this.source_info.room_name) >= 0) {
      number_of_carriers = 1
    }
    if (this.source_info.id == '59f19ff082100e1594f35c83') {  // top left of W49S47
      number_of_carriers = 2
    }

    if ((this.store) && (this.carriers.length < number_of_carriers)) {
      const source_noneed_carrier = (this.source_info.id == '59f19fff82100e1594f35e08')     // W48S47 center
      if (source_noneed_carrier) {
        return SpawnPriority.NONE
      }
      return SpawnPriority.NORMAL
    }
    return SpawnPriority.NONE
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    if (!this.harvester) {
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
    if (!this.harvester) {
      this.addHarvester(energyAvailable, spawnFunc)
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

    const name = this.generateNewName()
    let body: BodyPartConstant[] = []
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.CARRIER,
    }

    energyAvailable = Math.min(energyAvailable, 1200)

    while (energyAvailable >= energy_unit) {
      body = body.concat(body_unit)
      energyAvailable -= energy_unit
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  private harvest(): void {
    const harvester = this.harvester!

    if (!harvester) {
      return
    }
    if ((harvester.memory.status == CreepStatus.NONE) || ((harvester.carry[this.resource_type!] || 0) == 0)) {
      harvester.memory.status = CreepStatus.HARVEST
    }

    // Harvest
    if ((harvester.memory.status == CreepStatus.HARVEST) && ((harvester.carry[this.resource_type!] || 0) == 0) && this.store && ((this.store!.store![this.resource_type!] || 0) < this.store.storeCapacity) && this.resource_type) {
      const objects = harvester.room.lookAt(harvester)
      const dropped_object = objects.filter((obj) => {
        return (obj.type == 'resource')
          && ((obj.resource!.resourceType == this.resource_type))
      })[0]

      if (dropped_object) {
        const energy = dropped_object.resource!
        const pickup_result = harvester.pickup(energy)
        if (pickup_result != OK) {
          console.log(`HarvesterSquad.harvest() unexpected pickup result: ${pickup_result}, ${harvester.name}, ${this.name}`)
        }
      }
    }

    if ((harvester.memory.status == CreepStatus.HARVEST) && (((harvester.carry[this.resource_type!] || 0) == harvester.carryCapacity) || ((harvester.ticksToLive || 0) < 5))) {
      harvester.memory.status = CreepStatus.CHARGE
    }

    if (harvester.memory.status == CreepStatus.HARVEST) {
      if (this.source) {
        if (harvester.harvest(this.source!) == ERR_NOT_IN_RANGE) {
          const ignoreCreeps = harvester.pos.getRangeTo(this.source!) <= 2  // If the blocking creep is next to the source, ignore

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
      else if ((this.resource_type == RESOURCE_ENERGY) && (this.store!.hits < this.store!.hitsMax)) {
        harvester.repair(this.store!)
        return
      }
      else {
        const transfer_result = harvester.transfer(this.store!, this.resource_type!)
        switch (transfer_result) {
          case ERR_NOT_IN_RANGE:
            harvester.moveTo(this.store!)
            return

          case ERR_FULL:
            harvester.drop(this.resource_type!)
            break

          case OK:
          case ERR_BUSY:  // @fixme: The creep is still being spawned.
            break

          default:
            console.log(`HarvesterSquad.harvest() unexpected transfer result: ${transfer_result}, ${this.resource_type}, ${harvester.name}, ${this.name}, ${this.source_info.room_name}`)
            break
        }
        harvester.memory.status = CreepStatus.HARVEST
        return
      }
    }

    // Build
    if (harvester.memory.status == CreepStatus.BUILD) {
      const target = harvester.pos.findInRange(FIND_CONSTRUCTION_SITES, 1)[0] as ConstructionSite

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
          console.log(`HarvesterSquad.harvest no target source ${this.source_info.id}, ${this.name}`)
          return
        }
      }
    }
  }

  private carry(): void {
    this.carriers.forEach((creep, _) => {
      const needs_renew = (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || ((creep.ticksToLive || 0) < 400)

      if (needs_renew) {
        if (creep.room.spawns.length > 0) {
          creep.goToRenew(creep.room.spawns[0])
          return
        }
      }

      if ((creep.memory.status == CreepStatus.NONE) || ((creep.carry[this.resource_type!] || 0) == 0)) { // If the resource is not energy, it should be in the controlled room so resource_type should also be provided
        creep.memory.status = CreepStatus.HARVEST
      }

      // Harvest
      if (creep.memory.status == CreepStatus.HARVEST) {
        if (creep.carry[this.resource_type!] == creep.carryCapacity) {
          creep.memory.status = CreepStatus.CHARGE
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
        if ((creep.carry[this.resource_type!] || 0) == 0) {
          creep.memory.status = CreepStatus.HARVEST
          return
        }

        const transfer_result = creep.transfer(this.destination, this.resource_type!)
        switch (transfer_result) {
          case ERR_NOT_IN_RANGE:
            creep.moveTo(this.destination)
            break

          case ERR_FULL:
            if ((creep.carry[this.resource_type!] || 0) <= 100) {
              creep.memory.status = CreepStatus.HARVEST
            }
            break

          case OK:
            break

          default:
            console.log(`HarvesterSquad.carry() unexpected transfer result: ${transfer_result}, ${this.resource_type}, ${creep.name}, ${this.name}, ${this.source_info.room_name}`)
            break
        }
      }
    })
  }
}
