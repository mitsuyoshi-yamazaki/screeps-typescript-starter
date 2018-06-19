import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

interface GuardSquadMemory extends SquadMemory {
  target_room_name?: string
  target_id?: string
  stop_spawning?: boolean
}

export class GuardSquad extends Squad {
  private target_room_name: string
  private attacker: Creep | undefined
  private healer: Creep | undefined
  private ranged_attacker: Creep | undefined
  private need: CreepType.ATTACKER | CreepType.HEALER | CreepType.RANGED_ATTACKER | undefined

  constructor(readonly name: string, readonly base_room_name: string) {
    super(name)

    const memory = (Memory.squads[this.name] as GuardSquadMemory)
    this.target_room_name = memory.target_room_name || 'W42S48'

    this.creeps.forEach((creep) => {
      switch (creep.memory.type) {
        case CreepType.ATTACKER:
          this.attacker = creep
          break

        case CreepType.HEALER:
          this.healer = creep
          break

        case CreepType.RANGED_ATTACKER:
          this.ranged_attacker = creep
          break

        default:
          console.log(`GuardSquad.new unexpected creep type ${creep.memory.type}, ${creep.name}, ${this.name}`)
          break
        }
    })

    // console.log(`att: ${this.attacker}, heal: ${this.healer}, ra: ${this.ranged_attacker}, ${this.name}`)

    const observer = Game.getObjectById('5b1e1041c359e26f06c000c1') as StructureObserver | undefined
    if (observer) {
      observer.observeRoom(this.target_room_name)
    }

    if (!this.ranged_attacker) {
      this.need = CreepType.RANGED_ATTACKER
    }
    else if (!this.attacker) {
      this.need = CreepType.ATTACKER
    }
    else if (!this.healer) {
      this.need = CreepType.HEALER
    }

    // console.log(`NEED: ${this.need}, ${this.name}`)

    const attacker_dead = !this.attacker || (this.attacker && (this.attacker.room.name == 'W48S47'))
    const healer_dead = !this.healer || (this.healer && (this.healer.room.name == 'W48S47'))
    const ranged_attacker_dead = !this.ranged_attacker || (this.ranged_attacker && (this.ranged_attacker.room.name == 'W48S47'))

    if (attacker_dead && this.healer && (this.healer.room.name == this.target_room_name)) {
      this.healer.memory.squad_name == 'guard4847_3'
    }
  }

  public get type(): SquadType {
    return SquadType.GUARD
  }

  public static generateNewName(): string {
    return UID('Creep')
  }

  public generateNewName(): string {
    return GuardSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    const target_room = Game.rooms[this.target_room_name]

    if (!target_room) {
      return SpawnPriority.NONE
    }

    const spawn_count = target_room.find(FIND_HOSTILE_SPAWNS).length
    if (spawn_count == 0) {
      return SpawnPriority.NONE
    }

    const lab_tough = Game.getObjectById('5afb586ccae66639b23225e1') as StructureLab | undefined
    const lab_move = Game.getObjectById('5b228fe226aa371fc6f97346') as StructureLab | undefined

    if (lab_tough && (lab_tough.mineralAmount < 120)) {
      return SpawnPriority.NONE
    }
    if (lab_move && (lab_move.mineralAmount < 510)) {
      return SpawnPriority.NONE
    }

    const memory = (Memory.squads[this.name] as GuardSquadMemory)
    if (memory.stop_spawning) {
      return SpawnPriority.NONE
    }

    const room = Game.rooms[this.base_room_name]
    if (!room || !room.storage || !room.terminal) {
      return SpawnPriority.NONE
    }

    const energy = room.storage.store.energy + room.terminal.store.energy

    if (energy < 30000) {
      console.log(`InvaderSquad.spawnPriority lack of energy ${energy}`)
      return SpawnPriority.NONE
    }

    if (this.need) {
      switch (this.need) {
        case CreepType.RANGED_ATTACKER:
          return SpawnPriority.NORMAL

        case CreepType.ATTACKER:
          return SpawnPriority.URGENT

        case CreepType.HEALER:
          return SpawnPriority.URGENT
      }
    }

    return SpawnPriority.NONE
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    if (this.need) {
      switch (this.need) {
        case CreepType.RANGED_ATTACKER:
          return energy_available >= 4180

        case CreepType.ATTACKER:
          return energy_available >= 3210

        case CreepType.HEALER:
          return energy_available >= 7500
      }
    }
    return false
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    if (this.need) {
      switch (this.need) {
        case CreepType.RANGED_ATTACKER:
        this.addRangedAttacker(energy_available, spawn_func)
        return

        case CreepType.ATTACKER:
        this.addBoostedAttacker(spawn_func)
        return

        case CreepType.HEALER:
        this.addHealer(spawn_func)
        return
      }
    }
    return
  }

  public run(): void {



    // const memory = (Memory.squads[this.name] as GuardSquadMemory)
    // let target: Structure | Creep | undefined
    // if (memory.target_id) {
    //   target = Game.getObjectById(memory.target_id) as Structure | Creep | undefined
    // }

    this.runAttacker()
    this.runHealer()
    this.runRangedAttacker()

    // this.workers.forEach((creep) => {
    //   if ((creep.room.name == this.base_room_name) && lab_tough && (lab_tough.mineralAmount >= 150) && !creep.boost_info[TOUGH]) {
    //     if (lab_tough.boostCreep(creep) == ERR_NOT_IN_RANGE) {
    //       creep.moveTo(lab_tough)
    //     }
    //     return
    //   }
    //   else if ((creep.room.name == this.base_room_name) && lab_work && (lab_work.mineralAmount >= 150) && !creep.boost_info[WORK] && (['Creep71034667', 'Creep71036281', 'Creep71036651', 'Creep71039351', 'Creep71039624'].indexOf(creep.name) < 0)) {
    //     if (lab_work.boostCreep(creep) == ERR_NOT_IN_RANGE) {
    //       creep.moveTo(lab_work)
    //     }
    //     return
    //   }

    //   if (creep.moveToRoom(this.target_room_name) == ActionResult.IN_PROGRESS) {
    //     return
    //   }

    //   if (target && (target as Structure).structureType) {
    //     if (creep.dismantle((target as Structure)) == ERR_NOT_IN_RANGE) {
    //       creep.moveTo(target)
    //     }
    //     return
    //   }

    //   creep.dismantleObjects(this.target_room_name, undefined)
    // })

    // this.healers.forEach((creep) => {
    //   if ((creep.room.name == this.base_room_name) && lab_heal && (lab_heal.mineralAmount >= 750) && !creep.boost_info[HEAL]) {
    //     if (lab_heal.boostCreep(creep) == ERR_NOT_IN_RANGE) {
    //       creep.moveTo(lab_heal)
    //     }
    //     return
    //   }

    //   const nearby_damaged_creep = creep.pos.findInRange(FIND_MY_CREEPS, 1, {
    //     filter: (c: Creep) => {
    //       return (c.hits < c.hitsMax) && (c.hits > 0)
    //     }
    //   })[0]

    //   if (nearby_damaged_creep) {
    //     creep.heal(creep)
    //     if (creep.moveToRoom(this.target_room_name) == ActionResult.IN_PROGRESS) {
    //       return
    //     }
    //   }
    //   else {
    //     const damaged_creep = creep.pos.findClosestByPath(FIND_MY_CREEPS, {
    //       filter: (c: Creep) => {
    //         return (c.hits < c.hitsMax) && (c.hits > 0)
    //       }
    //     })

    //     if (damaged_creep) {
    //       creep.rangedHeal(damaged_creep)
    //       creep.moveTo(damaged_creep)
    //     }
    //     else {
    //       creep.heal(creep)
    //       if (creep.moveToRoom(this.target_room_name) == ActionResult.IN_PROGRESS) {
    //         return
    //       }
    //     }
    //   }
    // })

    // this.creeps.forEach((creep) => {
    //   if (creep.name != 'Creep71028131') {
    //     return
    //   }

    //   creep.heal(creep)

    //   if (creep.moveToRoom('W42S48') == ActionResult.IN_PROGRESS) {
    //     return
    //   }

    //   creep.moveTo(2, 47)
    // })
  }

  private runAttacker() {
    const lab_tough = Game.getObjectById('5afb586ccae66639b23225e1') as StructureLab | undefined
    // const lab_work = Game.getObjectById('') as StructureLab | undefined
    const lab_heal = Game.getObjectById('5b22b80fe65319287dc5ecce') as StructureLab | undefined
    const lab_attack = Game.getObjectById('5b22b94cb516ea5f55225541') as StructureLab | undefined
    const lab_ranged_attack = Game.getObjectById('5b22b58d31be7d52a5ddb788') as StructureLab | undefined
    const lab_move = Game.getObjectById('5b228fe226aa371fc6f97346') as StructureLab | undefined

    const target_wall = Game.getObjectById('5aaad46b80c9a51a13a00aa4') as StructureWall | undefined

    if (this.attacker) {
      if ((this.attacker.room.name == this.base_room_name) && lab_move && (lab_move.mineralAmount >= 510) && !this.attacker.boost_info[MOVE]) {
        if (lab_move.boostCreep(this.attacker) == ERR_NOT_IN_RANGE) {
          this.attacker.moveTo(lab_move)
        }
        return
      }
      if ((this.attacker.room.name == this.base_room_name) && lab_attack && (lab_attack.mineralAmount >= 870) && !this.attacker.boost_info[ATTACK]) {
        if (lab_attack.boostCreep(this.attacker) == ERR_NOT_IN_RANGE) {
          this.attacker.moveTo(lab_attack)
        }
        return
      }
      if ((this.attacker.room.name == this.base_room_name) && lab_tough && (lab_tough.mineralAmount >= 120) && !this.attacker.boost_info[TOUGH]) {
        if (lab_tough.boostCreep(this.attacker) == ERR_NOT_IN_RANGE) {
          this.attacker.moveTo(lab_tough)
        }
        return
      }

      // if (this.attacker.room.name == 'W48S47') {

      // }

      if (this.attacker.room.name != this.target_room_name) {
        if (this.healer) {
          this.attacker.searchAndDestroy({no_move: true})
          this.attacker.moveTo(this.healer)
        }
        else {
          this.attacker.searchAndDestroyTo(this.target_room_name, false)
        }
        return
      }

      if (target_wall) {
        const close_target = this.attacker.pos.findInRange(FIND_HOSTILE_CREEPS, 1)[0]
        if (close_target) {
          this.attacker.destroy(close_target, {no_move: true})
        }
        else {
          const no_move = !(!this.healer) && (this.healer.room.name == this.attacker.room.name) && (this.attacker.pos.getRangeTo(this.healer) > 1)
          this.attacker.destroy(target_wall, {no_move})
        }
      }
      else {
        this.attacker.searchAndDestroy()
      }
    }
  }

  private runHealer() {
    const lab_tough = Game.getObjectById('5afb586ccae66639b23225e1') as StructureLab | undefined
    // const lab_work = Game.getObjectById('') as StructureLab | undefined
    const lab_heal = Game.getObjectById('5b22b80fe65319287dc5ecce') as StructureLab | undefined
    const lab_attack = Game.getObjectById('5b22b94cb516ea5f55225541') as StructureLab | undefined
    const lab_ranged_attack = Game.getObjectById('5b22b58d31be7d52a5ddb788') as StructureLab | undefined
    const lab_move = Game.getObjectById('5b228fe226aa371fc6f97346') as StructureLab | undefined

    const target_wall = Game.getObjectById('5aaad46b80c9a51a13a00aa4') as StructureWall | undefined

    if (this.healer) {
      if ((this.healer.room.name == this.base_room_name) && lab_heal && (lab_heal.mineralAmount >= 510) && !this.healer.boost_info[HEAL]) {
        if (lab_heal.boostCreep(this.healer) == ERR_NOT_IN_RANGE) {
          this.healer.moveTo(lab_heal)
        }
        return
      }

      if (this.healer.room.name != this.target_room_name) {
        if (this.attacker && (this.attacker.room.name == this.healer.room.name) && (this.healer.pos.getRangeTo(this.attacker) > 2)) {
          // does nothing
        }
        else if (this.ranged_attacker && (this.ranged_attacker.room.name == this.healer.room.name) && (this.healer.pos.getRangeTo(this.ranged_attacker) > 2)) {
          // does nothing
        }
        else {
          this.healer.moveToRoom(this.target_room_name)
        }
        this.healer.healNearbyCreep()
        return
      }

      if (this.attacker) {
        this.healer.moveTo(this.attacker)
      }
      else if (this.ranged_attacker) {
        this.healer.moveTo(this.ranged_attacker)
      }
      else {
        this.healer.moveTo(18, 34)
      }

      this.healer.healNearbyCreep()
    }
  }

  private runRangedAttacker() {

    const lab_tough = Game.getObjectById('5afb586ccae66639b23225e1') as StructureLab | undefined
    // const lab_work = Game.getObjectById('') as StructureLab | undefined
    const lab_heal = Game.getObjectById('5b22b80fe65319287dc5ecce') as StructureLab | undefined
    const lab_attack = Game.getObjectById('5b22b94cb516ea5f55225541') as StructureLab | undefined
    const lab_ranged_attack = Game.getObjectById('5b22b58d31be7d52a5ddb788') as StructureLab | undefined
    const lab_move = Game.getObjectById('5b228fe226aa371fc6f97346') as StructureLab | undefined

    const target_wall = Game.getObjectById('5aaad46b80c9a51a13a00aa4') as StructureWall | undefined

    // const hoge = true

    // if (hoge) {
    //   return
    // }




    if (this.ranged_attacker) {
      if ((this.ranged_attacker.room.name == this.base_room_name) && lab_ranged_attack && (lab_ranged_attack.mineralAmount >= 300) && !this.ranged_attacker.boost_info[RANGED_ATTACK]) {
        if (lab_ranged_attack.boostCreep(this.ranged_attacker) == ERR_NOT_IN_RANGE) {
          this.ranged_attacker.moveTo(lab_ranged_attack)
        }
        return
      }

      if (this.ranged_attacker.room.name != this.target_room_name) {
        this.ranged_attacker.searchAndDestroy({no_move: true})

        if (this.healer) {
          this.ranged_attacker.moveTo(this.healer)
        }
        else if (this.attacker) {
          this.ranged_attacker.moveTo(this.attacker)
        }
        else {
          this.ranged_attacker.searchAndDestroyTo(this.target_room_name, false)
        }
        return
      }

      if (target_wall) {
        const close_target = this.ranged_attacker.pos.findInRange(FIND_HOSTILE_CREEPS, 4)[0]
        if (close_target) {
          this.ranged_attacker.destroy(close_target, {no_move: true})
        }
        else {
          this.ranged_attacker.destroy(target_wall)
        }
      }
      else {
        if (this.attacker) {
          this.ranged_attacker.moveTo(this.attacker)
          this.ranged_attacker.searchAndDestroy({no_move: true})
        }
      }
    }
  }

  // ---
  private addWorker(spawn_func: SpawnFunction): void {
    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
      MOVE, MOVE, MOVE, MOVE,
      WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE,
      WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE,
      WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE,
      WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE,
      WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE,
      MOVE,
    ]

    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.WORKER,
      should_notify_attack: false,
      let_thy_die: true,
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }



  private addBoostedAttacker(spawn_func: SpawnFunction): void {
    // 3210

    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      TOUGH, TOUGH, TOUGH, TOUGH,
      ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
      ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
      ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
      ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
      ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
      ATTACK, ATTACK, ATTACK,
      MOVE, MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE,
      ATTACK,
      MOVE, MOVE, MOVE, MOVE,
      MOVE,
    ]

    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.ATTACKER,
      should_notify_attack: false,
      let_thy_die: true,
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  private addHealer(spawn_func: SpawnFunction): void {
    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      MOVE, MOVE, MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE, MOVE,
      MOVE, MOVE, MOVE, MOVE, MOVE,
      HEAL, HEAL, HEAL, HEAL, HEAL,
      HEAL, HEAL, HEAL, HEAL, HEAL,
      HEAL, HEAL, HEAL, HEAL, HEAL,
      HEAL, HEAL, HEAL, HEAL, HEAL,
      HEAL, HEAL, HEAL, HEAL, HEAL,
    ]

    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.HEALER,
      should_notify_attack: false,
      let_thy_die: true,
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  private addRangedAttacker(energyAvailable: number, spawnFunc: SpawnFunction): void {
    // 4180

    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      TOUGH, TOUGH, TOUGH, TOUGH,
      RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE,
      HEAL, MOVE, HEAL, MOVE,
      HEAL, MOVE, HEAL, MOVE,
      HEAL, MOVE,
      MOVE, MOVE, MOVE, MOVE,
      MOVE, HEAL,
    ]
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.RANGED_ATTACKER,
      should_notify_attack: false,
      let_thy_die: true,
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }
}
