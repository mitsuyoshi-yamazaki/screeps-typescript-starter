import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export interface RaiderTarget {
  readonly id: string
  readonly lair_id: string
  readonly room_name: string
}

export class RaiderSquad extends Squad {
  private attacker: Creep | undefined
  private harvester: Creep | undefined
  private carrier: Creep | undefined

  private source: Mineral | undefined
  private lair: StructureKeeperLair | undefined
  private source_keeper: Creep | undefined

  private get needed_creep_type(): CreepType | null {
    const lab = Game.getObjectById('5af483456449d07df7f76acc') as StructureLab
    const can_boost = !(!lab) && (lab.mineralType == RESOURCE_UTRIUM_ACID) && (lab.mineralAmount >= 300)

    if (!this.attacker) {
      if (can_boost) {
        return CreepType.ATTACKER
      }
      return null
    }
    if (!this.harvester) {
      return CreepType.HARVESTER
    }
    if (!this.carrier) {
      return CreepType.CARRIER
    }
    return null
  }

  constructor(readonly name: string, readonly source_info: RaiderTarget) {
    super(name)

    this.source = Game.getObjectById(this.source_info.id) as Mineral
    this.lair = Game.getObjectById(this.source_info.lair_id) as StructureKeeperLair

    if (this.source) {
      this.source_keeper = this.source.pos.findInRange(FIND_HOSTILE_CREEPS, 6)[0]
    }

    this.creeps.forEach((creep) => {
      switch (creep.memory.type) {
        case CreepType.ATTACKER:
          this.attacker = creep
          break

        case CreepType.HARVESTER:
          this.harvester = creep
          break

        case CreepType.CARRIER:
          this.carrier = creep
          break

        default:
          break
      }
    })
  }

  public get type(): SquadType {
    return SquadType.RAIDER
  }

  public static generateNewName(): string {
    return UID(SquadType.RAIDER)
  }

  public generateNewName(): string {
    return RaiderSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    return SpawnPriority.NONE

    // const source = Game.getObjectById(this.source_info.id) as Mineral
    // if (!source || (source.ticksToRegeneration > 100)) {
    //   return SpawnPriority.NONE
    // }

    // return this.needed_creep_type ? SpawnPriority.URGENT : SpawnPriority.NONE
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    switch (this.needed_creep_type) {
      case CreepType.ATTACKER:
        return energy_available >= 1900
      case CreepType.HARVESTER:
        return energy_available >= 1660
      case CreepType.CARRIER:
        return energy_available >= 1060
      default:
        console.log(`RaiderSquad.hasEnoughEnergy unexpected creep type ${this.needed_creep_type}, ${this.name}`)
        return false
    }
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    switch (this.needed_creep_type) {
      case CreepType.ATTACKER:
        this.addAttacker(spawn_func)
        break

      case CreepType.HARVESTER:
        this.addHarvester(spawn_func)
        break

      case CreepType.CARRIER:
        this.addCarrier(spawn_func)
        break

      default:
        console.log(`RaiderSquad.addCreep unexpected creep type ${this.needed_creep_type}, ${this.name}`)
        break
      }
  }

  public run(): void {
    this.creeps.forEach((creep) => {
      switch (creep.memory.type) {
      case CreepType.ATTACKER:
        this.runAttacker(creep)
        break

      case CreepType.HARVESTER:
        this.runHarvester(creep)
        break

      case CreepType.CARRIER:
        this.runCarrier(creep)
        break

      default:
        console.log(`RaiderSquad.run unexpected creep type ${creep.memory.type}, ${this.name}`)
        break
      }
    })
  }

  public description(): string {
    const additional = this.creeps.size > 0 ? `, ${Array.from(this.creeps.values())[0].pos}` : ''
    return `${super.description()} ${additional}`
  }

  // --- Private ---
  private addAttacker(spawn_func: SpawnFunction): void {
    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
      MOVE, MOVE, MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
      ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
      MOVE, HEAL,
    ]
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.ATTACKER,
      let_thy_die: false,
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  private addHarvester(spawn_func: SpawnFunction): void {
    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      TOUGH, MOVE,
      WORK, CARRY, MOVE,
      WORK, CARRY, MOVE,
      WORK, CARRY, MOVE,
      WORK, CARRY, MOVE,
      WORK, CARRY, MOVE,
      WORK, CARRY, MOVE,
      WORK, CARRY, MOVE,
      WORK, CARRY, MOVE,
    ]
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.HARVESTER,
      let_thy_die: false,
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  private addCarrier(spawn_func: SpawnFunction): void {
    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      TOUGH, MOVE,
      CARRY, MOVE,
      CARRY, MOVE,
      CARRY, MOVE,
      CARRY, MOVE,
      CARRY, MOVE,
      CARRY, MOVE,
      CARRY, MOVE,
      CARRY, MOVE,
      CARRY, MOVE,
      CARRY, MOVE,
    ]
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.CARRIER,
      let_thy_die: false,
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  private runAttacker(creep: Creep): void {
    if (!creep.boosted) {
      const lab = Game.getObjectById('5af483456449d07df7f76acc') as StructureLab
      if (!lab) {
        console.log(`RaiderSquad.runAttacker cannot find lab ${this.name}, ${this.source_info.room_name}`)
        return
      }

      if (lab.boostCreep(creep) == ERR_NOT_IN_RANGE) {
        creep.moveTo(lab)
      }
      return
    }

    if (creep.moveToRoom(this.source_info.room_name) == ActionResult.IN_PROGRESS) {
      creep.say(this.source_info.room_name)
      return
    }

    if (!this.source || !this.lair) {
      console.log(`RaiderSquad.runAttacker cannot find source: ${this.source} or lair ${this.lair}, ${this.name}, ${this.source_info.id}, ${this.source_info.room_name}`)
      return
    }

    if (!this.source_keeper) {
      const damaged_creep = creep.pos.findClosestByPath(FIND_MY_CREEPS, {
        filter: c => {
          return (c.hits < c.hitsMax)
            && (c.id != creep.id)
        }
      })
      if (damaged_creep) {
        if (creep.heal(damaged_creep) == ERR_NOT_IN_RANGE) {
          if ((this.lair.ticksToSpawn || 1000) > 20) {
            creep.moveTo(damaged_creep)
          }
          creep.rangedHeal(damaged_creep)
        }
        else if (damaged_creep.name == creep.name) {
          creep.moveTo(this.lair)
        }
      }
      else {
        creep.heal(creep)
        creep.moveTo(this.lair)
      }
      return
    }

    if (creep.attack(this.source_keeper) == ERR_NOT_IN_RANGE) {
      creep.moveTo(this.source_keeper)
      creep.heal(creep)
    }
  }

  private runHarvester(creep: Creep): void {
    if (creep.memory.status == CreepStatus.NONE) {
      creep.memory.status = CreepStatus.HARVEST
    }

    if (creep.memory.status == CreepStatus.HARVEST) {
      if (creep.moveToRoom(this.source_info.room_name) == ActionResult.IN_PROGRESS) {
        creep.say(this.source_info.room_name)
        return
      }

      if (!this.source) {
        console.log(`RaiderSquad.runHarvester cannot find source: ${this.source}, ${this.name}, ${this.source_info.id}, ${this.source_info.room_name}`)
        return
      }

      const has_enough_resource = !(!this.carrier) && (_.sum(creep.carry) > 0)
      const should_run = !this.attacker && this.lair && ((this.lair.ticksToSpawn || 1000) < 12)

      if (has_enough_resource) {
        creep.transfer(this.carrier!, RESOURCE_ZYNTHIUM) // @fixme: specify in init argument
      }

      if (should_run) {
        creep.transfer(this.carrier!, RESOURCE_ZYNTHIUM) // @fixme: specify in init argument
        creep.memory.status = CreepStatus.CHARGE
        return
      }

      if (creep.harvest(this.source) == ERR_NOT_IN_RANGE) {
        creep.moveTo(this.source)
      }
    }

    if (creep.memory.status == CreepStatus.CHARGE) {
      if (_.sum(creep.carry) == 0) {
        creep.memory.status = CreepStatus.HARVEST
      }
      else {
        const terminal = Game.rooms['W48S47'].terminal!  // @fixme: specify in init argument

        if (creep.transfer(terminal, RESOURCE_ZYNTHIUM)) {  // @fixme: specify in init argument
          creep.moveTo(terminal)
        }
      }
    }
  }

  private runCarrier(creep: Creep): void {
    if (creep.memory.status == CreepStatus.NONE) {
      creep.memory.status = CreepStatus.HARVEST
    }
    if (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) {
      if (((creep.ticksToLive || 0) > 1450) || (!this.attacker)) {
        creep.memory.status = CreepStatus.HARVEST
      }
      else {
        creep.goToRenew(Game.spawns['Spawn1'])  // @fixme: specify in init argument
        return
      }
    }

    if (creep.memory.status == CreepStatus.HARVEST) {
      const should_run = !this.attacker && this.lair && ((this.lair.ticksToSpawn || 1000) < 10)

      if ((_.sum(creep.carry) == creep.carryCapacity) || !this.harvester) {
        creep.memory.status = CreepStatus.CHARGE
      }
      else if (should_run) {
        creep.memory.status = CreepStatus.CHARGE
      }
      else {
        if (creep.moveToRoom(this.source_info.room_name) == ActionResult.IN_PROGRESS) {
          creep.say(this.source_info.room_name)
          return
        }

        creep.moveTo(this.harvester)
      }
    }

    if (creep.memory.status == CreepStatus.CHARGE) {
      if (_.sum(creep.carry) == 0) {
        creep.memory.status = CreepStatus.HARVEST
        if (!creep.memory.let_thy_die && ((creep.ticksToLive || 0) < 100)) {
          creep.goToRenew(Game.spawns['Spawn1'])  // @fixme: specify in init argument
          return
        }
      }
      else {
        const terminal = Game.rooms['W48S47'].terminal!  // @fixme: specify in init argument

        if (creep.transfer(terminal, RESOURCE_ZYNTHIUM)) {  // @fixme: specify in init argument
          creep.moveTo(terminal)
        }
      }
    }
  }
}
