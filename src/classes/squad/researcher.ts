import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export interface ResearchTarget {
  readonly id: string
  readonly resource_type: ResourceConstant
}

// @todo: merge to worker
export class ResearcherSquad extends Squad {
  private needs_research: boolean

  constructor(readonly name: string, readonly room_name: string, readonly input_targets: ResearchTarget[], readonly output_targets: ResearchTarget[]) {
    super(name)

    const room = Game.rooms[this.room_name]

    let debug = false
    // if (this.room_name == 'W44S7') {
    //   debug = true
    // }

    if (!room || (room.spawns.length == 0)) {
      this.needs_research = false
      if (debug) {
        console.log(`ResearchSquad needs_research: ${this.needs_research}, no room`)
      }
      return
    }

    if ((this.input_targets.length == 0) || (this.output_targets.length == 0)) {
      this.needs_research = false
      if (debug) {
        console.log(`ResearchSquad needs_research: ${this.needs_research}, no targets, inputs: ${this.input_targets.length}, outputs: ${this.output_targets.length}`)
      }
    }
    else if (this.output_targets.map(t=>Game.getObjectById(t.id) as StructureLab).filter(l=>l.mineralAmount > 100).length > 0) {
      this.needs_research = true
      if (debug) {
        console.log(`ResearchSquad needs_research: ${this.needs_research}, has output compounds`)
      }
    }
    else {
      let room_resource: ResourceConstant | undefined // @fixme: temp code
      switch (this.room_name) {
        case 'E13S19':  // @fixme: it's in wc server, check Game.shard.name
          room_resource = RESOURCE_UTRIUM
          break

        case 'W48S47':
          room_resource = RESOURCE_OXYGEN
          break

        case 'W49S47':
          room_resource = RESOURCE_UTRIUM
          break

        case 'W49S34':
          room_resource = RESOURCE_KEANIUM
          break

        case 'W46S33':
          room_resource = RESOURCE_ZYNTHIUM
          break

        case 'W51S29':
          room_resource = RESOURCE_LEMERGIUM
          break

        case 'W44S7':
          room_resource = RESOURCE_HYDROGEN
          break

        case 'W42N1':
          room_resource = RESOURCE_CATALYST
          break

        case 'W48S6':
          room_resource = RESOURCE_HYDROGEN
          break

        case 'W47N2':
          room_resource = RESOURCE_HYDROGEN
          break

        case 'W43S5':
          room_resource = RESOURCE_UTRIUM
          break

        case 'W43N5':
          room_resource = RESOURCE_ZYNTHIUM
          break

        case 'W48N11':
          room_resource = RESOURCE_OXYGEN
          break

        default:
          break
      }

      if (!room_resource) {
        const message = `ResearcherSquad.run room_resource not defined for ${this.room_name}, ${this.name}`
        console.log(message)
        Game.notify(message)
        this.needs_research = false
        if (debug) {
          console.log(`ResearchSquad needs_research: ${this.needs_research}, room_resource not defined`)
        }
      }
      else {
        const room = Game.rooms[this.room_name]!
        const terminal_needs_resource = (room.terminal!.store[room_resource] || 0) < 5000
        const storage_has_resource = (room.storage!.store[room_resource] || 0) > 5000

        if (terminal_needs_resource && storage_has_resource) {
          this.needs_research = true
          if (debug) {
            console.log(`ResearchSquad needs_research: ${this.needs_research}, terminal nor storage has resource`)
          }
        }
        else {
          let needs = true
          this.input_targets.map(
            t=>t.resource_type
          ).forEach((resource_type) => {
            const room = Game.rooms[this.room_name]
            if ((room.terminal!.store[resource_type] || 0) == 0) {
              needs = false
            }
          })

          this.needs_research = needs
        }
      }
    }

    // this.needs_research = false // fixme

    // if (this.room_name == 'W48S47') {
    //   this.needs_research = false // somehow it's true in W48S47
    // }

    this.creeps.forEach((creep) => {
      creep.memory.let_thy_die = !this.needs_research
    })
  }

  public get type(): SquadType {
    return SquadType.RESEARCHER
  }

  public static generateNewName(): string {
    return UID(SquadType.RESEARCHER)
  }

  public generateNewName(): string {
    return ResearcherSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    if (this.creeps.size > 0) {
      return SpawnPriority.NONE
    }
    if (this.needs_research) {
      return SpawnPriority.LOW
    }
    return SpawnPriority.NONE
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    const energy_unit = 150
    const energy_needed = Math.min(Math.floor(capacity / energy_unit) * energy_unit, 1000)
    return energy_available >= energy_needed
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    const body_unit: BodyPartConstant[] = [CARRY, CARRY, MOVE]
    const energy_unit = 150

    const name = this.generateNewName()
    let body: BodyPartConstant[] = []
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.CARRIER,
      should_notify_attack: false,
      let_thy_die: false,
    }

    energy_available = Math.min(energy_available, 600)

    while (energy_available >= energy_unit) {
      body = body.concat(body_unit)
      energy_available -= energy_unit
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  public run(): void {
    this.creeps.forEach((creep) => {
      // creep.say(`${creep.memory.status}`)
      if (creep.spawning) {
        return
      }


      if (creep.room.name != this.room_name) {
        creep.moveToRoom(this.room_name)
        return
      }

      const needs_renew = !creep.memory.let_thy_die && ((creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || ((creep.ticksToLive || 0) < 300)) && this.needs_research

      if (needs_renew) {
        if ((creep.room.spawns.length > 0) && (creep.room.energyAvailable > 0)) {
          creep.goToRenew(creep.room.spawns[0])
          return
        }
        else if (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) {
          creep.memory.status = CreepStatus.HARVEST
        }
      }

      if ((Game.time % 53) == 5) {
        const move = ((Game.time % 8) + 1) as DirectionConstant
        creep.move(move)
        return
      }

      if (creep.memory.status == CreepStatus.NONE) {
        let room_resource: ResourceConstant | undefined // @fixme: temp code
        switch (this.room_name) {
          case 'E13S19':  // @fixme: it's in wc server, check Game.shard.name
            room_resource = RESOURCE_UTRIUM
            break

          case 'W48S47':
            room_resource = RESOURCE_OXYGEN
            break

          case 'W49S47':
            room_resource = RESOURCE_UTRIUM
            break

          case 'W49S34':
            room_resource = RESOURCE_KEANIUM
            break

          case 'W46S33':
            room_resource = RESOURCE_ZYNTHIUM
            break

          case 'W51S29':
            room_resource = RESOURCE_LEMERGIUM
            break

          case 'W44S7':
            room_resource = RESOURCE_HYDROGEN
            break

          case 'W42N1':
            room_resource = RESOURCE_CATALYST
            break

          case 'W48S6':
            room_resource = RESOURCE_HYDROGEN
            break

          case 'W47N2':
            room_resource = RESOURCE_HYDROGEN
            break

          case 'W43S5':
            room_resource = RESOURCE_UTRIUM
            break

          case 'W43N5':
            room_resource = RESOURCE_ZYNTHIUM
            break

          case 'W48N11':
            room_resource = RESOURCE_OXYGEN
            break
        }

        if (!room_resource) {
          console.log(`ResearcherSquad.run room_resource not defined for ${this.room_name}, ${this.name}`)
        }
        else {
          const room = Game.rooms[this.room_name]
          if (!room || !room.terminal || !room.storage) {
            if (this.room_name != 'W42N1') {
              console.log(`ERROR 1111`)
            }
            return
          }
          const terminal_needs_resource = (room.terminal.store[room_resource] || 0) < 5000
          const storage_has_resource = (room.storage.store[room_resource] || 0) > 5000

          if (terminal_needs_resource && storage_has_resource) {
            this.transferRoomResource(creep, room_resource)
            return
          }
        }

        creep.memory.status = CreepStatus.HARVEST
      }

      this.chargeLabs(creep)
    })
  }

  // --- Private ---
  private transferRoomResource(creep: Creep, resource_type: ResourceConstant): void {
    // creep.memory.status supporse to be NONE

    if (creep.carrying_resources().length == 0) {
      // Harvest
      if (creep.withdraw(creep.room.storage!, resource_type) == ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.storage!)
        return
      }
    }
    else {
      // Charge
      const carrying_resource_type = creep.carrying_resources()[0]
      const transfer_result = creep.transfer(creep.room.terminal!, carrying_resource_type)

      switch (transfer_result) {
        case OK:
          break

        case ERR_NOT_IN_RANGE:
          creep.moveTo(creep.room.terminal!)
          break

        default:
          console.log(`ResearcherSquad.transferRoomResource transfer failed with ${transfer_result}, ${this.name}, ${this.room_name}`)
          break
      }
    }
  }

  private chargeLabs(creep: Creep) {
    if (creep.memory.status == CreepStatus.NONE) {
      creep.memory.status = CreepStatus.HARVEST
    }
    if (creep.memory.status == CreepStatus.HARVEST) {
      const input_resource_types = this.input_targets.map(t=>t.resource_type)
      for (const resource_type of creep.carrying_resources()) {
        if (input_resource_types.indexOf(resource_type) >= 0) {
          continue
        }
        if (resource_type == RESOURCE_ENERGY) {
          continue
        }

        const transfer_result = creep.transfer(creep.room.terminal!, resource_type)

        if (transfer_result == OK) {
        }
        else if (transfer_result == ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.terminal!)
        }
        else {
          console.log(`ResearcherSquad.chargeLabs transfer micelleous resource failed with ${transfer_result}, resource: ${resource_type}, ${this.name}, ${creep.name}`)
        }
        return
      }

      for (const target of this.output_targets) {
        if ((creep.carry[target.resource_type] || 0) > 0) {
          const transfer_result = creep.transfer(creep.room.terminal!, target.resource_type)

          if (transfer_result == OK) {
          }
          else if (transfer_result == ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.terminal!)
          }
          else {
            console.log(`ResearcherSquad.chargeLabs transfer failed with ${transfer_result}, resource: ${target.resource_type}, ${this.name}, ${creep.name}`)
          }
          return
        }
      }

      let resource_amounts = new Map<ResourceConstant, number>()

      this.input_targets.forEach((target) => {
        const lab = Game.getObjectById(target.id) as StructureLab
        if (!lab) {
          console.log(`ResearcherSquad.run lab not found ${target.id}, ${target.resource_type}, ${this.name}, ${this.room_name}`)
          return
        }

        const energy_shortage = lab.energyCapacity - lab.energy
        resource_amounts.set(RESOURCE_ENERGY, (resource_amounts.get(RESOURCE_ENERGY) || 0) + energy_shortage)

        if (lab.mineralType == target.resource_type) {
          const mineral_shortage = Math.max((lab.mineralCapacity - 1000) - lab.mineralAmount, 0)
          resource_amounts.set(target.resource_type, (resource_amounts.get(target.resource_type) || 0) + mineral_shortage)
        }
        else if (lab.mineralAmount == 0) {  // lab has no mineral or different mineral
          resource_amounts.set(target.resource_type, lab.mineralCapacity)
        }
      })

      for (const resource_type of Array.from(resource_amounts.keys())) {
        if (resource_amounts.get(resource_type) == 0) {
          continue
        }
        if ((creep.room.terminal!.store[resource_type] || 0) == 0) {
          continue
        }

        const harvest_result = creep.withdraw(creep.room.terminal!, resource_type)
        if (harvest_result == OK) {
          creep.memory.status = CreepStatus.CHARGE
          return
        }
        else if (harvest_result == ERR_FULL) {
          creep.memory.status = CreepStatus.CHARGE
          return
        }
        else if (harvest_result == ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.terminal!)
          return
        }
        else if (harvest_result == ERR_NOT_ENOUGH_RESOURCES) {
          continue
        }
        else {
          console.log(`ResearcherSquad.chargeLabs withdraw failed with ${harvest_result}, resource: ${resource_type}, ${this.name}, ${creep.name}`)
          continue
        }
      }

      creep.memory.status = CreepStatus.CHARGE
    }
    if (creep.memory.status == CreepStatus.CHARGE) {
      // if resource_type unmatch, withdraw them

      for (const target of this.input_targets) {
        const lab = Game.getObjectById(target.id) as StructureLab
        if (!lab) {
          console.log(`ResearcherSquad.run lab not found ${target.id}, ${target.resource_type}, ${this.name}, ${this.room_name}`)
          continue
        }

        if ((lab.energy < lab.energyCapacity) && (creep.carry.energy > 0)) {
          const transfer_result = creep.transfer(lab, RESOURCE_ENERGY)
          switch (transfer_result) {
            case OK:
              break

            case ERR_NOT_IN_RANGE:
              creep.moveTo(lab)
              break

            default:
              console.log(`ResearcherSquad.chargeLabs transfer energy to input lab failed with ${transfer_result}, ${this.name}, ${this.room_name}, ${creep.name}`)
              break
          }
          return
        }

        if ((creep.carry[target.resource_type] || 0) == 0) {
          continue
        }

        const is_ok = (target.resource_type == lab.mineralType) || (!lab.mineralType)
        if (is_ok && (lab.mineralAmount < lab.mineralCapacity)) {
          const transfer_result = creep.transfer(lab, target.resource_type)
          switch (transfer_result) {
            case OK:
              break

            case ERR_NOT_IN_RANGE:
              creep.moveTo(lab)
              break

            default:
              console.log(`ResearcherSquad.chargeLabs transfer ${target.resource_type} failed with ${transfer_result}, ${this.name}, ${this.room_name}, ${creep.name}`)
              break
          }
          return
        }
      }

      // withdraw mismatched resource
      for (const target of this.input_targets) {
        const lab = Game.getObjectById(target.id) as StructureLab
        if (!lab) {
          console.log(`ResearcherSquad.run lab not found ${target.id}, ${target.resource_type}, ${this.name}, ${this.room_name}`)
          continue
        }
        if ((lab.mineralType == target.resource_type) || (lab.mineralAmount == 0)) {
          continue
        }

        const withdraw_result = creep.withdraw(lab, lab.mineralType as ResourceConstant)
        switch (withdraw_result) {
          case OK:
            break

          case ERR_NOT_IN_RANGE:
            creep.moveTo(lab)
            break

          default:
            console.log(`ResearcherSquad.chargeLabs withdraw misc resource failed with ${withdraw_result}, ${this.name}, ${this.room_name}, ${creep.name}`)
            break
        }
        creep.memory.status = CreepStatus.HARVEST
        return
      }

      for (const target of this.output_targets) {
        const lab = Game.getObjectById(target.id) as StructureLab
        if (!lab) {
          console.log(`ResearcherSquad.run lab not found ${target.id}, ${target.resource_type}, ${this.name}, ${this.room_name}`)
          continue
        }

        if ((creep.carry.energy > 0) && (lab.energy < lab.energyCapacity)) {
          const transfer_result = creep.transfer(lab, RESOURCE_ENERGY)
          switch (transfer_result) {
            case OK:
              break

            case ERR_NOT_IN_RANGE:
              creep.moveTo(lab)
              break

            default:
              console.log(`ResearcherSquad.chargeLabs transfer energy to output lab failed with ${transfer_result}, ${this.name}, ${this.room_name}, ${creep.name}`)
              break
          }
          return
        }

        if (_.sum(creep.carry) == creep.carryCapacity) {
          creep.memory.status = CreepStatus.HARVEST
        }

        let has_output = (lab.mineralType == target.resource_type) && (lab.mineralAmount > 300)
        const boost_compounds: ResourceConstant[] = [RESOURCE_GHODIUM_ACID, RESOURCE_CATALYZED_GHODIUM_ACID]

        if (lab.mineralType && boost_compounds.indexOf(lab.mineralType) >= 0) {
          has_output = (lab.mineralAmount > 1500)
        }
        if (this.room_name == 'W42N1') {
          has_output = (lab.mineralAmount > 300)
        }

        const has_micellaous = !(!lab.mineralType) && (lab.mineralType != target.resource_type)
        if (has_output || has_micellaous) {
          const withdraw_result = creep.withdraw(lab, lab.mineralType as ResourceConstant)
          switch (withdraw_result) {
            case OK:
              break

            case ERR_NOT_IN_RANGE:
              creep.moveTo(lab)
              break

            default:
              console.log(`ResearcherSquad.chargeLabs withdraw ${lab.mineralType} failed with ${withdraw_result}, ${this.name}, ${this.room_name}, ${creep.name}, ${lab.pos}`)
              break
          }
          return
        }
      }

      creep.memory.status = CreepStatus.NONE

      // console.log(`ResearchSquad.chargeLabs nothing to do ${this.name}, inputs: ${this.input_targets.map(t=>t.resource_type)}, outputs: ${this.output_targets.map(t=>t.resource_type)}`)
      // creep.say(`😴`)
    }
  }
}
