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
  private workers = new Map<string, Creep>()
  private healers = new Map<string, Creep>()

  constructor(readonly name: string, readonly base_room_name: string) {
    super(name)

    const memory = (Memory.squads[this.name] as GuardSquadMemory)
    this.target_room_name = memory.target_room_name || 'W42S48'

    this.creeps.forEach((creep) => {
      switch (creep.memory.type) {
        case CreepType.WORKER:
          this.workers.set(creep.name, creep)
          break

        case CreepType.HEALER:
          if (creep.name == 'Creep71028131') {
            break
          }
          this.healers.set(creep.name, creep)
          break

        default:
          console.log(`GuardSquad.new unexpected creep type ${creep.memory.type}, ${creep.name}, ${this.name}`)
          break
        }
    })

    const observer = Game.getObjectById('5b1e1041c359e26f06c000c1') as StructureObserver | undefined
    if (observer) {
      observer.observeRoom(this.target_room_name)
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
    const memory = (Memory.squads[this.name] as GuardSquadMemory)
    if (memory.stop_spawning) {
      return SpawnPriority.NONE
    }

    // const room = Game.rooms[this.base_room_name]
    // if (!room || !room.storage || !room.terminal) {
    //   return SpawnPriority.NONE
    // }

    // const energy = room.storage.store.energy + room.terminal.store.energy

    // if (energy < 50000) {
    //   console.log(`InvaderSquad.spawnPriority lack of energy ${energy}`)
    //   return SpawnPriority.NONE
    // }

    // let max = 2

    // if (this.healers.size >= max) {
    //   return SpawnPriority.NONE
    // }

    // const is_spawning = Array.from(this.creeps.values()).filter(c=>c.spawning).length > 0

    // if (is_spawning) {
    //   return SpawnPriority.NONE
    // }
    // return SpawnPriority.LOW

    return SpawnPriority.NONE
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    if (this.healers.size <= this.workers.size) {
      // Add healer
      return energy_available >= 7500
    }
    else {
      // Add worker
      return energy_available >= 3300
    }
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    if (this.healers.size <= this.workers.size) {
      // Add healer
      this.addHealer(spawn_func)
    }
    else {
      // Add worker
      this.addWorker(spawn_func)
    }
  }

  public run(): void {
    this.say(`ERR`)

    // const memory = (Memory.squads[this.name] as GuardSquadMemory)
    // let target: Structure | Creep | undefined
    // if (memory.target_id) {
    //   target = Game.getObjectById(memory.target_id) as Structure | Creep | undefined
    // }

    // // リソースが異なる
    // // const lab_tough = Game.getObjectById('5b22b94cb516ea5f55225541') as StructureLab | undefined
    // // const lab_work = Game.getObjectById('5b22b58d31be7d52a5ddb788') as StructureLab | undefined
    // // const lab_heal = Game.getObjectById('5b228fe226aa371fc6f97346') as StructureLab | undefined

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
}
