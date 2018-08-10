import { ErrorMapper } from "utils/ErrorMapper"
import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

interface ManualMemory extends CreepMemory {
  target_id?: string
  target_x?: number
  target_y?: number
  search_and_destroy?: boolean
  repairing_structure_id?: string
  history?: string[]
}

interface ManualSquadMemory extends SquadMemory {
  claimer_last_spawned?: number
  dismantle_room_name?: string
}

type MineralContainer = StructureTerminal | StructureStorage | StructureContainer
type MineralStore = MineralContainer | StructurePowerSpawn

export class ManualSquad extends Squad {
  private any_creep: Creep | undefined

  private attackers: Creep[] = []
  private workers: Creep[] = []
  private target_id?: string
  private desc?: string

  constructor(readonly name: string, readonly original_room_name: string, readonly base_room: Room) {
    super(name)

    this.any_creep = Array.from(this.creeps.values())[0]

    this.creeps.forEach((creep) => {
      switch (creep.memory.type) {
        case CreepType.ATTACKER:
          this.attackers.push(creep)
          break

        case CreepType.WORKER:
          this.workers.push(creep)
          break
      }
    })
  }

  public get type(): SquadType {
    return SquadType.MANUAL
  }

  public get spawnPriority(): SpawnPriority {
    const memory = Memory.squads[this.name] as ManualSquadMemory

    if (memory.stop_spawming) {
      return SpawnPriority.NONE
    }

    switch (this.original_room_name) {
      case 'W51S29': {
        const room = Game.rooms[this.original_room_name]
        if (!room || !room.storage || (room.storage.store.energy < 200000)) {
          return SpawnPriority.NONE
        }

        const lab_id = '5b258a00a84f8b52880bff57'
        const lab = Game.getObjectById(lab_id) as StructureLab | undefined
        const link = Game.getObjectById('5b25ad0900c9b15f092dfa9c') as StructureLink | undefined

        if (!lab || !link) {
          this.say(`NO LAB`)
          console.log(`ManualSquad.run no lab nor link for ${lab_id} ${this.name} ${this.original_room_name} `)
          return SpawnPriority.NONE
        }
        if ((lab.mineralType != RESOURCE_LEMERGIUM_HYDRIDE) || (lab.mineralAmount < 300)) {
          return SpawnPriority.NONE
        }

        return this.creeps.size < 1 ? SpawnPriority.LOW : SpawnPriority.NONE
        // return SpawnPriority.NONE
      }

      case 'W44S7': {
        const target_rooms: {[room_name: string]: boolean} = {
          W39S7: false,
          W38S7: false,
          W38S6: false,
          W38S5: false
        }
        const room = Game.rooms[this.original_room_name]
        if (!room || !room.terminal || !room.storage) {
          return SpawnPriority.NONE
        }

        this.creeps.forEach((creep) => {
          const creep_memory = creep.memory as ManualMemory
          if (!creep_memory.target_id) {
            return
          }

          if (target_rooms[creep_memory.target_id] != null) {
            target_rooms[creep_memory.target_id] = true
          }
        })

        for (const room_name in target_rooms) {
          const has_creep = target_rooms[room_name]
          if (has_creep == null) {
            continue
          }
          if (!has_creep) {
            this.target_id = room_name
            this.desc = `next: ${room_name}`
            return SpawnPriority.LOW
          }
        }

        return SpawnPriority.NONE
      }

      case 'W43S5': {
        // const target_room_memory = Memory.rooms['W45S5']
        // if (target_room_memory && target_room_memory.attacked_time) {
        //   return SpawnPriority.NONE
        // }
        // return this.creeps.size < 1 ? SpawnPriority.LOW : SpawnPriority.NONE
        return SpawnPriority.NONE
      }

      case 'W48S6': {
        const room = Game.rooms[this.original_room_name]
        const target_room = Game.rooms['W47S9']

        if (!room || !room.storage) {
          return SpawnPriority.NONE
        }
        if (room.storage.store.energy < 200000) {
          return SpawnPriority.NONE
        }
        if (target_room && (target_room.controller) && (target_room.controller.level > 5)) {
          return SpawnPriority.NONE
        }
        return this.creeps.size < 2 ? SpawnPriority.LOW : SpawnPriority.NONE
      }

      case 'W43S2': {
        return this.creeps.size < 4 ? SpawnPriority.LOW : SpawnPriority.NONE
      }

      case 'W42N1': {
        return this.spawnPriorityForBoostCarrier(RESOURCE_GHODIUM_ACID)
      }

      case 'W47N2': {
        return this.spawnPriorityForBoostCarrier(RESOURCE_CATALYZED_GHODIUM_ACID)
      }

      case 'W43N5': {
        const room = Game.rooms[this.original_room_name]
        if (!room || !room.storage) {
          return SpawnPriority.NONE
        }
        if (room.storage.store.energy < 500000) {
          return SpawnPriority.NONE
        }

        if (room.storage.store.energy > 700000) {
          if (this.creeps.size < 2) {
            return SpawnPriority.NORMAL
          }
        }

        return this.creeps.size < 3 ? SpawnPriority.LOW : SpawnPriority.NONE
        // return SpawnPriority.NONE
      }

      case 'W48N11': {
        // return this.creeps.size < 1 ? SpawnPriority.LOW : SpawnPriority.NONE
        return SpawnPriority.NONE
      }

      case 'W47N5': {
        // const base_room = Game.rooms['W47N2']
        // if (!base_room || !base_room.storage) {
        //   return SpawnPriority.NONE
        // }

        // if (base_room.storage.store.energy < 200000) {
        //   return SpawnPriority.NONE
        // }

        // return this.creeps.size < 2 ? SpawnPriority.LOW : SpawnPriority.NONE
        return SpawnPriority.NONE
      }

      case 'E16N37': {
        const target_room_name = 'E15N37'
        const room = Game.rooms[target_room_name]
        if (!room) {
          return SpawnPriority.NONE
        }
        if ((!room.storage || (_.sum(room.storage.store) == 0)) && (!room.terminal || (_.sum(room.terminal.store) == 0))) {
          return SpawnPriority.NONE
        }

        return this.creeps.size < 4 ? SpawnPriority.LOW : SpawnPriority.NONE
      }

      case 'W56S7': {
        return this.creeps.size < 1 ? SpawnPriority.NORMAL : SpawnPriority.NONE
      }

      default:
        return SpawnPriority.NONE
    }
  }

  public static generateNewName(): string {
    return UID('M')
  }

  public generateNewName(): string {
    return ManualSquad.generateNewName()
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    switch (this.original_room_name) {
      case 'W49S34':
        if (this.attackers.length == 0) {
          return energy_available >= 1240
        }
        else if ((this.attackers.length < 2) && !this.attackers[0].spawning && ((this.attackers[0].ticksToLive || 1000) < 550)) {
          return energy_available >= 1240
        }
        return energy_available >= 2250 // worker

      case 'W49S48':
        return energy_available >= 150

      case 'W48S47':
        return energy_available >= 300

      case 'W49S47':
        return energy_available >= 200

      case 'W51S29':
        return energy_available >= 1150

      case 'W49S26':
        return energy_available >= 1600

      case 'W44S7':
        // if (this.target_id == 'W38S5') {
          return energy_available >= 2600
        // }
        // return energy_available >= 1950

      case 'W43S5':
        return this.hasEnoughEnergyForLightWeightHarvester(energy_available, capacity)

      case 'W48S6':
        return energy_available >= 2000

      case 'W43S2':
        const energy = (capacity >= 1200) ? 1200 : 800
        return energy_available >= energy

      case 'W42N1':
        return energy_available >= 150

      case 'W47N2':
        return energy_available >= 150

      case 'W43N5': {
        return this.hasEnoughEnergyForUpgrader(energy_available, capacity, 2800)
      }

      case 'W48N11': {
        return energy_available >= 1760
      }

      case 'W47N5': {
        return energy_available >= 2000
      }

      case 'E16N37': {
        return energy_available >= 1500
      }

      case 'W56S7': {
        return energy_available >= 200
      }

      default:
        return false
    }
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    switch (this.original_room_name) {
      case 'W49S34': {
        const attacker_body: BodyPartConstant[] = [
          TOUGH, MOVE, TOUGH, MOVE,
          ATTACK, MOVE, ATTACK, MOVE,
          ATTACK, MOVE, ATTACK, MOVE,
          MOVE, MOVE, HEAL, HEAL
        ]
        if (this.attackers.length == 0) {
          this.addGeneralCreep(spawn_func, attacker_body, CreepType.ATTACKER)
          return
        }
        else if ((this.attackers.length < 2) && !this.attackers[0].spawning && ((this.attackers[0].ticksToLive || 1000) < 550)) {
          this.addGeneralCreep(spawn_func, attacker_body, CreepType.ATTACKER)
          return
        }
        const worker_body: BodyPartConstant[] = [
          WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE,
          WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE,
          WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE,
        ]
        this.addGeneralCreep(spawn_func, worker_body, CreepType.WORKER)
        return
      }

      case 'W49S48':
        this.addCarrier(energy_available, spawn_func)
        return

      case 'W48S47':
        this.addGeneralCreep(spawn_func, [MOVE, MOVE, CARRY, CARRY, CARRY, MOVE], CreepType.CARRIER)
        return

      case 'W49S47':
        this.addGeneralCreep(spawn_func, [MOVE, MOVE, CARRY, CARRY], CreepType.CARRIER)
        return

      case 'W51S29': {
        this.addUpgrader(energy_available, spawn_func, CreepType.WORKER, {max_energy: 1150})
        return
      }

      case 'W49S26': {
        const body: BodyPartConstant[] = [
          CARRY, CARRY, CARRY, CARRY, CARRY,
          CARRY, CARRY, CARRY, CARRY, CARRY,
          CARRY, CARRY, CARRY, CARRY, CARRY,
          CARRY,
          MOVE, MOVE, MOVE, MOVE, MOVE,
          MOVE, MOVE, MOVE, MOVE, MOVE,
          MOVE, MOVE, MOVE, MOVE, MOVE,
          MOVE,
        ]
        this.addGeneralCreep(spawn_func, body, CreepType.CARRIER)
        return
      }

      case 'W48S6': {
        const body: BodyPartConstant[] = [
          MOVE, MOVE, MOVE, MOVE, MOVE,
          CARRY, CARRY, CARRY, CARRY, CARRY,
          CARRY, CARRY, CARRY, CARRY, CARRY,
          CARRY, CARRY, CARRY, CARRY, CARRY,
          CARRY, CARRY, CARRY, CARRY, CARRY,
          MOVE, MOVE, MOVE, MOVE, MOVE,
          MOVE, MOVE, MOVE, MOVE, MOVE,
          MOVE, MOVE, MOVE, MOVE, MOVE,
        ]
        this.addGeneralCreep(spawn_func, body, CreepType.CARRIER)
        return
      }

      case 'W44S7': {
        let body: BodyPartConstant[] = [
          CLAIM, CLAIM, CLAIM, CLAIM,
          MOVE, MOVE, MOVE, MOVE,
        ]

        // if (this.target_id == 'W38S5') {
        //   body = [
        //     CLAIM, CLAIM, CLAIM, CLAIM,
        //     MOVE, MOVE, MOVE, MOVE,
        //   ]
        // }
        const name = this.generateNewName()
        const memory: ManualMemory = {
          squad_name: this.name,
          status: CreepStatus.NONE,
          birth_time: Game.time,
          type: CreepType.CLAIMER,
          should_notify_attack: false,
          let_thy_die: true,
          target_id: this.target_id,
        }

        if (!this.target_id) {
          console.log(`ManualSquad.addCreep error no target id`)
        }

        const result = spawn_func(body, name, {
          memory: memory
        })
        return
      }

      case 'W43S5': {
        this.addLightWeightHarvester(energy_available, spawn_func)
        return
      }

      case 'W43S2': {
        let body: BodyPartConstant[] = [
          MOVE, MOVE, MOVE, MOVE, MOVE,
          WORK, WORK, WORK, WORK, WORK,
        ]

        if (energy_available >= 1200) {
          body = [
            MOVE, MOVE, MOVE, MOVE,
            MOVE, MOVE, MOVE, MOVE,
            WORK, WORK, WORK, WORK,
            WORK, WORK, WORK, WORK,
          ]
        }
        this.addGeneralCreep(spawn_func, body, CreepType.CARRIER)
        return
      }

      case 'W42N1': {
        this.addGeneralCreep(spawn_func, [CARRY, CARRY, MOVE], CreepType.CARRIER)
        return
      }

      case 'W47N2': {
        this.addGeneralCreep(spawn_func, [CARRY, CARRY, MOVE], CreepType.CARRIER)
        return
      }

      case 'W43N5': {
        this.addUpgrader(energy_available, spawn_func, CreepType.WORKER, {max_energy: 2800})
        return
      }

      case 'W48N11': {
        // 1500
        const body: BodyPartConstant[] = [
          ATTACK, ATTACK,
          MOVE, MOVE,
          MOVE, MOVE, MOVE, MOVE,
          MOVE, MOVE, MOVE, MOVE, MOVE,
          WORK, WORK, WORK, WORK, WORK,
          WORK, WORK, WORK, WORK, WORK,
          MOVE,
        ]
        this.addGeneralCreep(spawn_func, body, CreepType.WORKER)
        return
      }

      case 'W47N5': {
                // 2000
                const body: BodyPartConstant[] = [
                  MOVE, MOVE, MOVE, MOVE, MOVE,
                  MOVE, MOVE, MOVE, MOVE, MOVE,
                  MOVE, MOVE, MOVE, MOVE, MOVE,
                  CARRY, CARRY, CARRY, CARRY, CARRY,
                  CARRY, CARRY, CARRY, CARRY, CARRY,
                  CARRY, CARRY, CARRY, CARRY, CARRY,
                  CARRY, CARRY, CARRY, CARRY, CARRY,
                  MOVE, MOVE, MOVE, MOVE, MOVE,
                ]
                this.addGeneralCreep(spawn_func, body, CreepType.CARRIER)
                return
      }

      case 'E16N37': {
        const body: BodyPartConstant[] = [
          MOVE, MOVE, MOVE, MOVE, MOVE,
          // MOVE, MOVE, MOVE, MOVE, MOVE,
          // MOVE, MOVE, MOVE, MOVE, MOVE,
          CARRY, CARRY, CARRY, CARRY, CARRY,
          CARRY, CARRY, CARRY, CARRY, CARRY,
          CARRY, CARRY, CARRY, CARRY, CARRY,
          CARRY, CARRY, CARRY, CARRY, CARRY,
          MOVE, MOVE, MOVE, MOVE, MOVE,
        ]
        this.addGeneralCreep(spawn_func, body, CreepType.CARRIER)
        return
      }

      case 'W56S7': {
        this.addGeneralCreep(spawn_func, [CARRY, CARRY, CARRY, MOVE], CreepType.CARRIER)
        return
      }

      default:
        return
    }
  }

  public run(): void {
    const squad_memory = Memory.squads[this.name] as ManualSquadMemory
    if (squad_memory.dismantle_room_name) {
      if (this.dismantle(squad_memory.dismantle_room_name) == ActionResult.DONE) {
        (Memory.squads[this.name] as ManualSquadMemory).dismantle_room_name = undefined
      }
      return
    }

    switch (this.original_room_name) {

      case 'W51S29': {
        const lab_id = '5b258a00a84f8b52880bff57'
        const lab = Game.getObjectById(lab_id) as StructureLab | undefined

        const link = Game.getObjectById('5b25ad0900c9b15f092dfa9c') as StructureLink | undefined

        this.creeps.forEach((creep) => {
          const memory = creep.memory as ManualMemory

          if (!creep.boosted() && lab && (lab.mineralType == RESOURCE_LEMERGIUM_HYDRIDE) && (lab.mineralAmount >= 300)) {
            if (lab.boostCreep(creep) == ERR_NOT_IN_RANGE) {
              creep.moveTo(lab)
            }
            return
          }

          const x = 14
          const y = 20

          if (!creep.memory.stop) {
            creep.moveTo(x, y)
          }
          if ((creep.pos.x != x) || (creep.pos.y != y)) {
            return
          }

          if (!link) {
            creep.say(`NO LNK`)
            return
          }

          const withdraw_result = creep.withdraw(link, RESOURCE_ENERGY)

          let target: StructureWall | StructureRampart | undefined

          if (memory.target_id && ((Game.time % 29) != 7)) {
            target = Game.getObjectById(memory.target_id) as StructureWall | StructureRampart | undefined
          }

          if (!target) {
            const walls = creep.pos.findInRange(FIND_STRUCTURES, 3, {
              filter: (structure: Structure) => {
                return (structure.structureType == STRUCTURE_WALL) || (structure.structureType == STRUCTURE_RAMPART)
              }
            }) as (StructureWall | StructureRampart)[]

            target = walls.sort(((lhs, rhs) => {
              const l_hits = Math.floor(lhs.hits / 100000)
              const r_hits = Math.floor(rhs.hits / 100000)
              if (l_hits < r_hits) return -1
              else if (l_hits > r_hits) return 1
              else return 0
            }))[0]
          }

          if (!target) {
            creep.say(`NO TGT`)
            return
          }

          (creep.memory as ManualMemory).target_id = target.id

          const repair_result = creep.repair(target)
          if (repair_result != OK) {
            creep.say(`E${repair_result}`)
          }
          else {
            creep.say(`${Math.floor(target.hits / 1000)}k`)
          }
        })
        return
      }

    case 'W49S26':{
      // const base_room_name = this.original_room_name
      // const target_room_name = 'W49S27'

      // this.creeps.forEach((creep) => {
      //   if ((creep.room.name == 'W51S29') && (creep.carry.energy  == 0)) {
      //     const room = Game.rooms['W51S29']

      //     if (creep.withdraw(room.terminal!, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
      //       creep.moveTo(room.terminal!)
      //       return
      //     }
      //     return
      //   }
      // })

      // if (this.stealEnergyFrom(base_room_name, target_room_name, 7, 38, false) == ActionResult.IN_PROGRESS) {
      //   return
      // }
      const next_squad_name = 'manual4919'
      this.creeps.forEach((creep) => {
        creep.memory.squad_name = next_squad_name
      })
      return
    }
      case 'W48S19': {
        const worker_squad_name = 'worker71825555'
        if (this.dismantle('W49S19') == ActionResult.IN_PROGRESS) {
          return
        }
        this.creeps.forEach((creep) => {
          creep.memory.squad_name = worker_squad_name
        })
        return
      }

      case 'W48S12':{
        this.dismantle('W42S4')
        return
      }

      case 'W49S19': {
        this.creeps.forEach((creep) => {
          creep.memory.let_thy_die = false
        })

        const base_room_name = this.original_room_name
        const target_room_name = 'W49S18'

        this.stealEnergyFrom(target_room_name, 20, 33, {should_die: true})

        this.renewIfNeeded()
        return
      }

      case 'W44S7': {
        this.creeps.forEach((creep) => {
          const creep_memory = creep.memory as ManualMemory
          if (!creep_memory || !creep_memory.target_id) {
            console.log(`ManualSquad.run ${this.original_room_name} error no target room name ${creep.name} ${creep.pos}`)
            return
          }

          const room_name = creep_memory.target_id
          creep.claim(room_name)
        })
        return
      }

      case 'W43S5': {
        this.creeps.forEach((creep) => {
          (creep.memory as {target_id?: string}).target_id = '5a412a0d45b7612ba7ee5934'
        })

        this.dismantle('W42N3')
        return
      }

      case 'W48S6': {
        const room = Game.rooms[this.original_room_name]
        const target_room = Game.rooms['W47S9']

        if (!room || !target_room) {
          console.log(`ManualSquad.run ${this.original_room_name} unexpectedly null rooms ${room}, ${target_room}, ${this.name}`)
          return
        }

        this.transferRoom(room, target_room, {x: 36, y: 8}, 200, 'worker72220381')
        return
      }

      case 'W47N2': {
        // const room = Game.rooms[this.original_room_name]
        // const lab = Game.getObjectById('5b430aad8f11f24a0236521a') as StructureLab | undefined

        // if (!room || !room.terminal || !lab) {
        //   this.say(`ERR`)
        //   return
        // }

        // this.transferMineralToLab(room.terminal, lab, RESOURCE_CATALYZED_GHODIUM_ACID)
        return
      }

      case 'W42N1': {
        const room = Game.rooms[this.original_room_name]
        const lab = Game.getObjectById('5b403626bf3716439f3d880a') as StructureLab | undefined

        if (!room || !room.terminal || !lab) {
          this.say(`ERR`)
          return
        }

        this.transferMineralToLab(room.terminal, lab, RESOURCE_GHODIUM_ACID)
        return
      }

      case 'W43N5': {

        // const sender_link = Game.getObjectById('5b50b0f99ebfe7026c47f415') as StructureLink | undefined
        // const receiver_link = Game.getObjectById('5b360f3491f023098d6515f2') as StructureLink | undefined

        // if (!sender_link || !receiver_link) {
        //   if ((Game.time % 71) == 0) {
        //     const message = `ManualSquad.run ${this.original_room_name} link not found ${this.name}`
        //     console.log(message)
        //     Game.notify(message)
        //   }
        // }
        // else if ((sender_link.cooldown == 0)) {
        //   if ((sender_link.energy > (sender_link.energyCapacity * 0.5))) {
        //     sender_link.transferEnergy(receiver_link)
        //   }
        // }

        // this.creeps.forEach((creep) => {
        //   if (!receiver_link || !creep.room.controller || !creep.room.controller.my) {
        //     return
        //   }

        //   const withdraw_result = creep.withdraw(receiver_link, RESOURCE_ENERGY)
        //   creep.upgradeController(creep.room.controller)

        //   if (!creep.memory.stop) {
        //     creep.moveTo(receiver_link)

        //     if (withdraw_result == OK) {
        //       creep.memory.stop = true
        //     }
        //   }
        // })
        return
      }

      case 'W48N11': {
        const target_room_name = 'W49N12'

        if (this.any_creep) {
          if ((this.any_creep.room.name == target_room_name)) {
            const hostile_worker = this.any_creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS)

            if (hostile_worker) {
              this.any_creep.destroy(hostile_worker)
              return
            }
          }
        }

        this.dismantle(target_room_name)
        return
      }

      case 'W47N5': {
        const base_room = Game.rooms['W47N2']
        if (!base_room || !base_room.storage) {
          this.say(`ERR`)
          console.log(`ManualSquad.run ${this.name} error`)
          return
        }

        this.creeps.forEach((creep) => {
          if (creep.spawning) {
            return
          }

          if (creep.carry.energy > 0) {
            if (creep.moveToRoom(this.original_room_name) == ActionResult.IN_PROGRESS) {
              return
            }

            const x = 34
            const y = 7

            if ((creep.pos.x != x) || (creep.pos.y != y)) {
              creep.moveTo(x, y, {maxRooms: 0, reusePath: 10})
              return
            }

            creep.drop(RESOURCE_ENERGY)
            return
          }
          else {
            if ((creep.ticksToLive || 1500) < 200) {
              creep.memory.squad_name = 'worker734834525' // W47N2 worker
              return
            }

            if (creep.moveToRoom(base_room.name) == ActionResult.IN_PROGRESS) {
              return
            }

            if (creep.withdraw(base_room.storage!, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
              creep.moveTo(base_room.storage!, {maxRooms: 4, reusePath: 10})
            }
          }
        })

        return
      }

      case 'E16N37': {
        const target_room_name = 'E15N37'
        this.stealEnergyFrom(target_room_name, 14, 29, {ticks_to_return: 120, worker_squad_name: 'worker_e16n37'})
        return
      }

      case 'W56S7': {
        const from_link = Game.getObjectById('5b642f7f1407e03f53c3f3f5') as StructureLink | undefined
        const to_link = Game.getObjectById('5b64042a3081766dddad9352') as StructureLink | undefined
        const container = Game.getObjectById('5b6429cb3369a7643bb60c1d') as StructureContainer | undefined // does not exist
        if (!from_link || !to_link) {
          console.log(`ManualSquad.run error no links for ${this.original_room_name}`)
          return
        }
        if (!this.base_room.storage) {
          console.log(`ManualSquad.run error no storage for ${this.original_room_name}`)
          return
        }
        const storage = this.base_room.storage
        const x = 16
        const y = 4

        this.creeps.forEach((creep) => {
          if ((creep.pos.x != x) || (creep.pos.y != y)) {
            creep.moveTo(x, y)
          }

          let result: ScreepsReturnCode

          if (creep.carry.energy > 0) {
            // Charge
            if (from_link.energy < from_link.energyCapacity) {
              result = creep.transfer(from_link, RESOURCE_ENERGY)
            }
            else if (container && (container.store.energy < container.storeCapacity)) {
              result = creep.transfer(container, RESOURCE_ENERGY)
            }
            else {
              result = creep.transfer(storage, RESOURCE_ENERGY)
            }
          }
          else {
            // Withdraw
            result = creep.withdraw(storage, RESOURCE_ENERGY)
          }

          if (result != OK) {
            creep.say(`E${result}`)
          }
        })

        // Links
        if ((from_link.cooldown == 0) && (from_link.energy > (from_link.energyCapacity * 0.5)) && (to_link.energy < (to_link.energyCapacity * 0.5))) {
          const transfer_result = from_link.transferEnergy(to_link)

          if (transfer_result != OK) {
            console.log(`ManualSquad.run energy transfer failed ${transfer_result}, ${this.original_room_name}`)
          }
        }

        return
      }

      default:
        if (this.creeps.size > 0) {
          this.say(`NO SCR`)
          console.log(`ManualSquad.run error no script for ${this.original_room_name}`)
        }
        return
    }
  }

  public description(): string {
    const addition = this.creeps.size > 0 ? `, ${Array.from(this.creeps.values())[0].pos}` : ''
    return `${super.description()} ${this.desc || addition}`
  }


  // --- Private ---
  private addWorker(energy_available: number, spawn_func: SpawnFunction): void {
    const energy_unit = 200
    let body_unit: BodyPartConstant[] = [WORK, CARRY, MOVE]

    let body: BodyPartConstant[] = []
    const name = this.generateNewName()
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.WORKER,
      should_notify_attack: false,
      let_thy_die: false,
    }

    energy_available = Math.min(energy_available, 1400)

    while (energy_available >= energy_unit) {
      body = body.concat(body_unit)
      energy_available -= energy_unit
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  private addClaimer(energy_available: number, spawn_func: SpawnFunction): ScreepsReturnCode {
    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      CLAIM, MOVE, CLAIM, MOVE
    ]
    const memory: ManualMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.CLAIMER,
      should_notify_attack: false,
      let_thy_die: true,
      history: []
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
    return result
  }

  public addCarrier(energy_available: number, spawn_func: SpawnFunction): ScreepsReturnCode {
    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      CARRY, CARRY, MOVE
    ]
    const memory: ManualMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.CARRIER,
      should_notify_attack: false,
      let_thy_die: true,
      history: []
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
    return result
  }

  public addRangedHunter(energy_available: number, spawn_func: SpawnFunction): ScreepsReturnCode {
    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      TOUGH, MOVE, TOUGH, MOVE,
      TOUGH, MOVE, TOUGH, MOVE,
      RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE,  // 5
      RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE,  // 10
      HEAL, MOVE, HEAL, MOVE,
      HEAL, MOVE, HEAL, MOVE,
      HEAL, MOVE, HEAL, MOVE,
    ]
    const memory: ManualMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.ATTACKER,
      should_notify_attack: false,
      let_thy_die: true,
      history: []
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
    return result
  }

  public addLightWeightHarvester(energy_available: number, spawn_func: SpawnFunction): void {
    const body_unit: BodyPartConstant[] = [WORK, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE]
    const energy_unit = 450
    energy_available = Math.min(energy_available, 2250)

    const name = this.generateNewName()
    let body: BodyPartConstant[] = []
    const memory: ManualMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.HARVESTER,
      should_notify_attack: false,
      let_thy_die: false,
      history: [],
    }

    while (energy_available >= energy_unit) {
      body = body.concat(body_unit)
      energy_available -= energy_unit
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  private addHealer(energyAvailable: number, spawnFunc: SpawnFunction): void {
    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      MOVE, MOVE, MOVE, MOVE, MOVE,
      HEAL, HEAL, HEAL, HEAL, HEAL, HEAL,
      MOVE,
    ]
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.HEALER,
      should_notify_attack: false,
      let_thy_die: true,
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  private addAttacker(energyAvailable: number, spawnFunc: SpawnFunction): void {

    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE,
      RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE,
      ATTACK, MOVE, ATTACK, MOVE,
      ATTACK, MOVE, ATTACK, MOVE,
      ATTACK, MOVE, ATTACK, MOVE,
      ATTACK, MOVE, ATTACK, MOVE,
      ATTACK, MOVE, ATTACK, MOVE,
      HEAL, MOVE,
      HEAL, MOVE,
      HEAL, MOVE,
      HEAL, MOVE,
      HEAL, MOVE,
    ]
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.ATTACKER,
      should_notify_attack: false,
      let_thy_die: true,
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }


  // ---
  private spawnPriorityForBoostCarrier(resource_type: ResourceConstant): SpawnPriority {
    const room = Game.rooms[this.original_room_name]
    if (!room || !room.terminal) {
      return SpawnPriority.NONE
    }

    if ((room.terminal.store[resource_type] || 0) < 100) {
      return SpawnPriority.NONE
    }
    return this.creeps.size < 1 ? SpawnPriority.LOW : SpawnPriority.NONE
  }

  private renewIfNeeded(): void {
    this.creeps.forEach((creep) => {
      const needs_renew = !creep.memory.let_thy_die && ((creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || (((creep.ticksToLive || 0) < 350) && (creep.carry.energy > (creep.carryCapacity * 0.8))))// !creep.memory.let_thy_die && ((creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || ((creep.ticksToLive || 0) < 300))

      if (needs_renew) {
        if ((creep.room.spawns.length > 0) && ((creep.room.energyAvailable > 40) || ((creep.ticksToLive ||0) > 400)) && !creep.room.spawns[0].spawning) {
          creep.goToRenew(creep.room.spawns[0])
          return
        }
        else if (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) {
          creep.memory.status = CreepStatus.HARVEST
        }
      }
    })
  }

  private runAttacker() {
    const lab = Game.getObjectById('5afb5a00c41b880caa6c3058') as StructureLab | undefined
    const target_room_name = 'W45S41'

    this.creeps.forEach((creep) => {
      (creep.memory as {target_id?: string}).target_id = '5ac2d005bc88a23950950fe4'

      if (!creep.boosted() && lab && (lab.mineralType == RESOURCE_UTRIUM_ACID)) {
        if (lab.boostCreep(creep) == ERR_NOT_IN_RANGE) {
          creep.moveTo(lab)
          creep.heal(creep)
          return
        }
      }

      if (creep.room.name != target_room_name) {
        const hostile_creep = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 4)[0]

        if (hostile_creep) {
          creep.destroy(hostile_creep)
          return
        }
      }

      if (creep.moveToRoom(target_room_name) == ActionResult.IN_PROGRESS) {
        creep.heal(creep)
        return
      }

      creep.searchAndDestroy()
    })
  }

  private runForcedScout() {
    const target_room_name = 'W48S42'
    const waypoint_1 = 'W49S45'
    const waypoint_2 = 'W47S42'

    let first_creep = true

    this.creeps.forEach((creep) => {
      this.creeps.forEach((creep) => {
        creep.moveTo(16, 8)
      })

      const memory = creep.memory as ManualMemory

      if (!memory.target_id) {
        (creep.memory as ManualMemory).target_id = waypoint_1
      }
      else if (memory.target_id == waypoint_1) {
        if (creep.moveToRoom(waypoint_1) == ActionResult.IN_PROGRESS) {
          return
        }
        (creep.memory as ManualMemory).target_id = waypoint_2
      }
      else if (memory.target_id == waypoint_2) {
        if (creep.moveToRoom(waypoint_2) == ActionResult.IN_PROGRESS) {
          return
        }
        if (first_creep) {
          first_creep = false
        }
        else {

        }
      }
    })
  }

  private transferRoom(from: Room, to: Room, destination_position: {x:number, y:number}, estimated_ticks: number, worker_squad_name: string): void {
    this.creeps.forEach((creep) => {
      if (creep.spawning) {
        return
      }

      if (creep.carry.energy == 0) {
        if (creep.room.is_keeperroom) {
          if (creep.moveToRoom(from.name) == ActionResult.IN_PROGRESS) {
            return
          }
        }

        if ((creep.ticksToLive || 1500) < estimated_ticks) {
          creep.memory.squad_name = worker_squad_name
          return
        }

        if (!from.storage) {
          creep.say(`NO SRC`)
          console.log(`ManualSquad.transferRoom no storage in room ${from.name} ${this.name}`)
          return
        }

        if (creep.withdraw(from.storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(from.storage)
        }
      }
      else {
        if (creep.room.is_keeperroom) {
          if (creep.moveToRoom(to.name) == ActionResult.IN_PROGRESS) {
            return
          }
        }

        if (to.storage) {
          if (creep.transfer(to.storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(to.storage)
          }
          return
        }

        if ((creep.pos.x != destination_position.x) || (creep.pos.y != destination_position.y)) {
          const pos = new RoomPosition(destination_position.x, destination_position.y, to.name)
          creep.moveTo(pos)
          return
        }

        creep.drop(RESOURCE_ENERGY)
      }
    })
  }

  private runClaimer() {
    const first_room_name = 'W48S33'
    const second_room_name = 'W51S29'
    const waypoint_room_name = 'W50S33'

    this.creeps.forEach((creep) => {
      if (creep.getActiveBodyparts(CLAIM) == 0) {
        return
      }

      const room_name_to_claim = 'W46S33'
      const room_to_claim = Game.rooms[room_name_to_claim]

      if (room_to_claim && room_to_claim.controller && room_to_claim.controller.my) {
        const memory = creep.memory as ManualMemory

        if (!memory.target_id) {
          (creep.memory as ManualMemory).target_id = first_room_name
        }

        const target_room_name = memory.target_id!

        if (creep.moveToRoom(target_room_name) == ActionResult.IN_PROGRESS) {
          return
        }

        if ([first_room_name, second_room_name].indexOf(target_room_name) >= 0) {
          const room = Game.rooms[target_room_name]
          if (room && room.controller && !room.controller.my) {
            const should_claim = !room.controller.owner && (target_room_name == 'W51S29')
            const result = should_claim ? creep.claimController(room.controller) : creep.attackController(room.controller)

            switch (result) {
              case OK:
                if (target_room_name == second_room_name) {
                  return
                }
                else {
                  (creep.memory as ManualMemory).target_id = waypoint_room_name
                  return
                }
                // break

              case ERR_TIRED:
                break

              case ERR_NOT_IN_RANGE:
                creep.moveTo(room.controller)
                break

              default:
                const message = `Cannot attackController ${result} ${target_room_name}, ${creep.name}`
                console.log(message)
                Game.notify(message)
                break
            }
          }
          else {
            console.log(`${target_room_name} is already mine`)
          }
        }
        else {
          (creep.memory as ManualMemory).target_id = second_room_name
        }
      }
      else {
        if (creep.moveToRoom(room_name_to_claim) == ActionResult.IN_PROGRESS) {
          return
        }

        if (!room_to_claim || !room_to_claim.controller) {
          console.log(`SOMETHING WRONG!`)
          return
        }

        creep.claim(room_name_to_claim, true)
      }
    })
  }

  private chargeNuke(): void {
    const room = Game.rooms[this.original_room_name] as Room | undefined

    if (!room || !room.terminal || !room.storage) {
      console.log(`ManualSquad.chargeNuke no room | terminal | storage ${this.name}`)
      return
    }

    const nuker = room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return structure.structureType == STRUCTURE_NUKER
      }
    })[0] as StructureNuker | undefined

    if (!nuker) {
      console.log(`ManualSquad.chargeNuke no nuker ${this.name}`)
      return
    }

    const resource_type = RESOURCE_GHODIUM

    this.creeps.forEach((creep) => {
      if (nuker.ghodium == nuker.ghodiumCapacity) {
        creep.say(`DONE`)
        return
      }

      if (creep.getActiveBodyparts(CARRY) == 0) {
        console.log(`ManualSquad.chargeNuke no CARRY body parts  ${this.name}`)
        creep.say(`ERROR`)
        return
      }

      if ((creep.carry[resource_type] || 0) < _.sum(creep.carry)) {
        if (creep.transferResources(room.terminal!) == ERR_NOT_IN_RANGE) {
          creep.moveTo(room.terminal!)
        }
        return
      }

      if (creep.memory.status == CreepStatus.HARVEST) {
        if (_.sum(creep.carry) == creep.carryCapacity) {
          creep.memory.status = CreepStatus.CHARGE
        }
        else if ((room.terminal!.store[resource_type] || 0) > 0) {
          if (creep.withdraw(room.terminal!, resource_type) == ERR_NOT_IN_RANGE) {
            creep.moveTo(room.terminal!)
          }
        }
        else if ((room.storage!.store[resource_type] || 0) > 0) {
          if (creep.withdraw(room.storage!, resource_type) == ERR_NOT_IN_RANGE) {
            creep.moveTo(room.storage!)
          }
        }
        else if ((creep.carry[resource_type] || 0) > 0) {
          creep.memory.status = CreepStatus.CHARGE
        }
        else {
          console.log(`ManualSquad.chargeNuke no enough ${resource_type} ${this.name}`)
          creep.say(`ERROR`)
          return
        }
      }
      else {
        creep.memory.status = CreepStatus.CHARGE

        if ((creep.carry[resource_type] || 0) == 0) {
          creep.memory.status = CreepStatus.HARVEST
          return
        }

        if (creep.transfer(nuker, resource_type) == ERR_NOT_IN_RANGE) {
          creep.moveTo(nuker)
        }
      }
    })
  }

  private transferMineralToLab(from: MineralContainer, to: StructureLab, resource_type: ResourceConstant): void {
    if (!from || !to || !resource_type) {
      const message = `ManualSquad.transferMineralToLab invalid args ${this.name} ${this.original_room_name}`
      console.log(message)
      Game.notify(message)
      return
    }

    this.creeps.forEach((creep) => {
      if (creep.getActiveBodyparts(CARRY) == 0) {
        console.log(`ManualSquad.transferMineralToLab no CARRY body parts  ${this.name}`)
        creep.say(`ERROR`)
        return
      }

      if ((to.mineralType != resource_type) && (to.mineralType != null)) {
        if (_.sum(creep.carry) > 0) {
          if (creep.transferResources(from) == ERR_NOT_IN_RANGE) {
            creep.moveTo(from)
          }
          return
        }
        if (creep.withdraw(to, to.mineralType) == ERR_NOT_IN_RANGE) {
          creep.moveTo(to)
        }
        return
      }

      if ((to.mineralAmount == to.mineralCapacity)) {
        if ((_.sum(creep.carry) > 0)) {
          if (creep.transferResources(from) == ERR_NOT_IN_RANGE) {
            creep.moveTo(from)
          }
        }
        else {
          return
        }
        return
      }

      if (creep.memory.status == CreepStatus.CHARGE) {
        if ((creep.carry[resource_type] || 0) == 0) {
          if (_.sum(creep.carry) > 0) {
            if (creep.transferResources(from) == ERR_NOT_IN_RANGE) {
              creep.moveTo(from)
            }
            return
          }
          creep.memory.status = CreepStatus.HARVEST
          return
        }

        if (creep.transfer(to, resource_type) == ERR_NOT_IN_RANGE) {
          creep.moveTo(to)
        }
      }
      else {
        if ((creep.carry[resource_type] || 0) == 0) {
          if (_.sum(creep.carry) > 0) {
            if (creep.transferResources(from) == ERR_NOT_IN_RANGE) {
              creep.moveTo(from)
            }
            return
          }
        }

        creep.memory.status = CreepStatus.HARVEST

        if (_.sum(creep.carry) == creep.carryCapacity) {
          creep.memory.status = CreepStatus.CHARGE
          return
        }

        const amount = Math.min(creep.carryCapacity, (to.mineralCapacity - to.mineralAmount))
        const result = creep.withdraw(from, resource_type, amount)

        switch (result) {
          case OK:
            creep.memory.status = CreepStatus.CHARGE
            break

          case ERR_NOT_IN_RANGE:
            creep.moveTo(from)
            break

          case ERR_NOT_ENOUGH_RESOURCES:
            if (_.sum(creep.carry) == 0) {
              creep.say(`DONE`)
            }
            else {
              creep.memory.status = CreepStatus.CHARGE
            }
            break

          default:
            creep.say(`ERROR`)
            console.log(`ManualSquad.transferMineral unknown withdraw error ${result}, ${this.name}, ${creep.name}, ${from}`)
            break
        }
      }
    })
  }

  private transferMineral(from: MineralContainer, to: MineralStore, resource_type: ResourceConstant): void {
    // const switch_structure = function(structure: MineralContainer, case_lab: (lab: StructureLab) => void, case_other: (structure: {store: StoreDefinition}) => void): void {
    //   if ((structure as StructureLab).mineralCapacity) {
    //     case_lab((structure as StructureLab))
    //   }
    //   else {
    //     case_other(structure as {store: StoreDefinition})
    //   }
    // }

    this.creeps.forEach((creep) => {
      if (creep.getActiveBodyparts(CARRY) == 0) {
        console.log(`ManualSquad.transferMineral no CARRY body parts`)
        creep.say(`ERROR`)
        return
      }
      if (creep.memory.status == CreepStatus.CHARGE) {
        if (_.sum(creep.carry) == 0) {
          creep.memory.status = CreepStatus.HARVEST
          return
        }

        if (to.structureType == STRUCTURE_POWER_SPAWN) {
          if (resource_type == RESOURCE_POWER) {
            if (creep.transfer(to, resource_type) == ERR_NOT_IN_RANGE) {
              creep.moveTo(to)
            }
          }
          else {
            console.log(`ManualSquad.run failed ${resource_type} cannot be transfered to PowerSpawn ${to} ${this.original_room_name}`)
          }
          return
        }
        if (creep.transferResources(to) == ERR_NOT_IN_RANGE) {
          creep.moveTo(to)
        }
      }
      else {
        creep.memory.status = CreepStatus.HARVEST

        if (_.sum(creep.carry) == creep.carryCapacity) {
          creep.memory.status = CreepStatus.CHARGE
          return
        }

        const result = creep.withdraw(from, resource_type)

        switch (result) {
          case OK:
            break

          case ERR_NOT_IN_RANGE:
            creep.moveTo(from)
            break

          case ERR_NOT_ENOUGH_RESOURCES:
            if (_.sum(creep.carry) == 0) {
              creep.say(`DONE`)
            }
            else {
              creep.memory.status = CreepStatus.CHARGE
            }
            break

          default:
            creep.say(`ERROR`)
            console.log(`ManualSquad.transferMineral unknown withdraw error ${result}, ${this.name}, ${creep.name}, ${from}`)
            break
        }
      }
    })
  }

  private withdrawFromLabs(): void {
    this.creeps.forEach((creep) => {
      if (_.sum(creep.carry) > 0) {
        const resource_type = creep.carrying_resources()[0]
        if (creep.transfer(creep.room.terminal!, resource_type) == ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.terminal!)
        }
        return
      }

      const target = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return ((structure.structureType == STRUCTURE_LAB) && (structure.mineralAmount > 0))
        }
      })[0] as StructureLab | undefined

      if (!target) {
        creep.say("😴")
        return
      }

      if (creep.withdraw(target, target.mineralType as ResourceConstant) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target)
      }
    })
  }

  private stealEnergyFrom(target_room_name: string, x: number, y: number, opts?: {should_die?: boolean, ticks_to_return?:number, worker_squad_name?: string}): ActionResult {
    const options = opts || {}
    let result: ActionResult = ActionResult.DONE
    const steal_energy = !this.base_room.storage

    if (!Memory.debug.test) {
      Memory.debug.test = []
    }

    const before_cpu = Game.cpu.getUsed()

    this.creeps.forEach((creep) => {
      if (creep.spawning) {
        return
      }
      if (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) {
        result = ActionResult.IN_PROGRESS
        return
      }

      const carry = _.sum(creep.carry)

      if ((creep.memory.status != CreepStatus.HARVEST) && (creep.memory.status != CreepStatus.CHARGE)) {
        creep.memory.status = CreepStatus.HARVEST
      }

      if (creep.memory.status == CreepStatus.HARVEST) {
        if (carry == creep.carryCapacity) {
          creep.memory.status = CreepStatus.CHARGE
        }
        else {
          if (creep.moveToRoom(target_room_name) == ActionResult.IN_PROGRESS) {
            result = ActionResult.IN_PROGRESS
            return
          }
          const target_room = Game.rooms[target_room_name]
          if (!target_room) {
            return
          }

          let target: AnyStructure | undefined
          let no_more_target = true
          const memory = creep.memory as ManualMemory

          if (memory.target_id) {
            target = Game.getObjectById(memory.target_id) as AnyStructure | undefined
          }

          if (!target) {
            if (target_room.storage && steal_energy && (target_room.storage.store.energy > 0)) {
              target = target_room.storage
            }
            else if (target_room.storage && !steal_energy && (_.sum(target_room.storage.store) > 0)) {
              target = target_room.storage
            }
            else if (target_room.terminal && steal_energy && (target_room.terminal.store.energy > 0)) {
              target = target_room.terminal
            }
            else if (target_room.terminal && !steal_energy && (_.sum(target_room.terminal.store) > 0)) {
              target = target_room.terminal
            }
            else {
              target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (structure) => {
                  // if (structure.structureType == STRUCTURE_CONTAINER) {
                  //   return structure.store.energy > 0  // to not harvest from remote harvester container
                  // }
                  // else if (
                  if (structure.structureType == STRUCTURE_LAB) {
                    return (structure.energy > 0) || (structure.mineralAmount > 0)
                  }
                  else if (
                    (structure.structureType == STRUCTURE_LINK)
                    || (structure.structureType == STRUCTURE_EXTENSION)
                    || (structure.structureType == STRUCTURE_SPAWN)
                    || (structure.structureType == STRUCTURE_TOWER)
                  ) {
                    return structure.energy > 0
                  }
                  return false
                }
              })

              if (!target) {
                no_more_target = true
              }
            }
          }

          if (!target) {
            if (!no_more_target) {
              return
            }
            (creep.memory as ManualMemory).target_id = undefined
            creep.say(`NO TGT`)
            if (carry > 0) {
              creep.memory.status = CreepStatus.CHARGE
              return
            }
            if (options.should_die) {
              creep.memory.let_thy_die = true
            }
            return
          }

          let withdraw_result: ScreepsReturnCode
          const has_store = target as {store: StoreDefinition}

          if (has_store.store) {
            withdraw_result = creep.withdrawResources(has_store)
          }
          else if (target.structureType == STRUCTURE_LAB) {
            if (target.mineralType && (target.mineralAmount > 0)) {
              withdraw_result = creep.withdraw(target, target.mineralType)
            }
            else {
              withdraw_result = creep.withdraw(target, RESOURCE_ENERGY)
            }
          }
          else {
            withdraw_result = creep.withdraw(target, RESOURCE_ENERGY)
          }

          if (withdraw_result == ERR_NOT_IN_RANGE) {
            creep.moveTo(target)
            return
          }
          else if (withdraw_result != OK) {
            creep.say(`E${withdraw_result}`)
          }
          else {
            (creep.memory as ManualMemory).target_id = undefined
          }
        }
      }

      if (creep.memory.status == CreepStatus.CHARGE) {
        (creep.memory as ManualMemory).target_id = undefined

        if (carry == 0) {
          creep.memory.status = CreepStatus.HARVEST
          result = ActionResult.IN_PROGRESS

          if (options.ticks_to_return && options.worker_squad_name && ((creep.ticksToLive || 1500) < options.ticks_to_return)) {
            creep.memory.squad_name = options.worker_squad_name
            return
          }
          return
        }

        if (creep.moveToRoom(this.base_room.name) == ActionResult.IN_PROGRESS) {
          result = ActionResult.IN_PROGRESS
          return
        }

        if (creep.carry.energy > 0) {
          const charge_target = creep.find_charge_target()
          if (charge_target) {
            if (creep.transfer(charge_target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
              creep.moveTo(charge_target)
            }
            result = ActionResult.IN_PROGRESS
            return
          }
        }

        if (creep.room.controller && creep.room.controller.my && creep.room.storage) {
          const transfer_result = creep.transferResources(creep.room.storage)
          if (transfer_result == ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.storage)
          }
          else if (transfer_result != OK) {
            creep.say(`E${transfer_result}`)
          }
          result = ActionResult.IN_PROGRESS
          return
        }

        creep.moveTo(x, y)
        if ((creep.pos.x == x) && (creep.pos.y == y)) {
          creep.drop(RESOURCE_ENERGY)
          creep.memory.status = CreepStatus.HARVEST
          result = ActionResult.IN_PROGRESS
          return
        }
      }
    })

    const after_cpu = Game.cpu.getUsed()
    const cpu_usage = Math.ceil((after_cpu - before_cpu) * 1000) / 1000
    const measurement = 20

    if (Memory.debug.test.length >= measurement) {
      Memory.debug.test.shift()
      // console.log(`ManualSquad cpu usage: ${_.sum(Memory.debug.test) / measurement}, ${Memory.debug.test}`)
    }

    Memory.debug.test.push(cpu_usage)

    return result
  }

  // private chargeLab(): void {
  //   // It's in room W44S42
  //   // const resource = RESOURCE_UTRIUM_ACID
  //   // const lab = Game.getObjectById('5af7db5db44f464c8ea3a7f5') as StructureLab

  //   const resource = RESOURCE_LEMERGIUM_ALKALIDE
  //   const lab = Game.getObjectById('5af7c5180ce89a3235fd46d8') as StructureLab

  //   if ((this.creeps.size > 0) && (lab.mineralAmount > 0) && (lab.mineralType != resource)) {
  //     console.log(`Manual.run lab mineral type is different from specified one ${resource}, ${lab.mineralType}, ${lab.id}`)
  //     return
  //   }

  //   this.creeps.forEach((creep) => {
  //     if (creep.memory.status == CreepStatus.NONE) {
  //       creep.memory.status = CreepStatus.HARVEST
  //     }

  //     const source = creep.room.terminal!
  //     let resource_type: ResourceConstant = RESOURCE_ENERGY

  //     if (creep.memory.status == CreepStatus.HARVEST) {
  //       if ((lab.mineralCapacity - lab.mineralAmount) < 400) {
  //         creep.memory.status = CreepStatus.NONE
  //         creep.say('😴')
  //         return
  //         }
  //       else if ((creep.carry.energy > 0) && ((creep.carry[resource] || 0) > 0)) {
  //         creep.memory.status = CreepStatus.CHARGE
  //       }
  //       else {
  //         let amount = 1

  //         if (creep.carry.energy > 0) {
  //           resource_type = resource
  //           amount = 380
  //         }

  //         const r = creep.withdraw(source, resource_type, amount)
  //         if (r == ERR_NOT_IN_RANGE) {
  //           creep.moveTo(source)
  //           creep.say('🏦')
  //         }
  //         else if (r != OK) {
  //           creep.say(`w${r}`)
  //         }
  //       }
  //     }
  //     if (creep.memory.status == CreepStatus.CHARGE) {
  //       if ((creep.carry.energy == 0) && ((creep.carry[resource] || 0) == 0)) {
  //         creep.memory.status = CreepStatus.CHARGE
  //       }
  //       else {
  //         if ((creep.carry.energy == 0) || (lab.energy == lab.energyCapacity)) {
  //           resource_type = resource

  //           if ((creep.carry[resource_type] || 0) == 0) {
  //             creep.memory.status = CreepStatus.HARVEST
  //           }
  //           else if (lab.mineralAmount == lab.mineralCapacity) {
  //             creep.memory.status = CreepStatus.NONE
  //           }
  //         }

  //         if (creep.transfer(lab, resource_type) == ERR_NOT_IN_RANGE) {
  //           creep.moveTo(lab)
  //           creep.say('💊')
  //         }
  //       }
  //     }
  //   })
  // }

  private withdrawFromHostileLinkAndTower(): ActionResult {
    const room = Game.rooms[this.original_room_name]
    if (!room || !room.controller || !room.controller.my) {
      this.say(`NO ROM`)
      return ActionResult.DONE
    }
    const controller = room.controller

    const target = room.find(FIND_HOSTILE_STRUCTURES, {
      filter: (structure: AnyOwnedStructure) => {
        if (structure.structureType == STRUCTURE_LINK) {
          return true
        }
        if (structure.structureType == STRUCTURE_TOWER) {
          return true
        }
        return false
      }
    })[0] as StructureLink | StructureTower | undefined

    if (!target) {
      this.say(`NO TGT`)
      return ActionResult.DONE
    }

    this.creeps.forEach((creep) => {
      if (creep.carry.energy > 0) {
        if (creep.upgradeController(controller) == ERR_NOT_IN_RANGE) {
        }
        creep.moveTo(controller)
        return
      }
      else {
        if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(target)
        }
        return
      }
    })
    return ActionResult.IN_PROGRESS
  }

  private dismantleSpawnsAndExtensions(target_room_name: string): ActionResult {
    let result_sum: ActionResult = ActionResult.DONE

    this.creeps.forEach((creep) => {
      creep.drop(RESOURCE_ENERGY)

      if (creep.moveToRoom(target_room_name) == ActionResult.IN_PROGRESS) {
        result_sum = ActionResult.IN_PROGRESS
        return
      }

      const hostile_extension = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
        filter: (structure) => {
          if (structure.structureType == STRUCTURE_SPAWN) {
            return true
          }
          if (structure.structureType == STRUCTURE_EXTENSION) {
            return true
          }
          return false
        }
      })

      if (!hostile_extension) {
        creep.say(`DONE!`)
        return
      }

      if (creep.dismantle(hostile_extension) == ERR_NOT_IN_RANGE) {
        creep.moveTo(hostile_extension)
      }
      result_sum = ActionResult.IN_PROGRESS
    })

    return result_sum
  }

  private dismantle(target_room_name: string, include_wall?: boolean): ActionResult {
    const room = Game.rooms[target_room_name]
    if (room && room.controller && room.controller.my) {
      const message = `ManualSquad.dismantle target room ${target_room_name} has my controller, are you sure? ${this.name}`
      console.log(message)
      Game.notify(message)
      return ActionResult.DONE
    }

    let result_sum: ActionResult = ActionResult.DONE

    this.creeps.forEach((creep) => {
      const result = creep.dismantleObjects(target_room_name, include_wall)

      if (result == ActionResult.IN_PROGRESS) {
        result_sum = ActionResult.IN_PROGRESS
      }
    });
    return result_sum
  }

  private attack(): void {
    this.creeps.forEach((creep, _) => {
      // const waypoint = 'W44S48'
      // if ((creep.memory.status != CreepStatus.BREAK) && (creep.moveToRoom(waypoint) != ActionResult.DONE)) {
      //   creep.say(waypoint)
      //   creep.memory.status = CreepStatus.NONE
      //   return
      // }
      // creep.memory.status = CreepStatus.BREAK

      const target_room_name = 'W47S45'

      if (creep.moveToRoom(target_room_name) != ActionResult.DONE) {
        creep.say(target_room_name)
        return
      }

      const hostile_attacker: Creep = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
        filter: (creep) => {
          return creep.body.filter((body: BodyPartDefinition) => {
            return (body.type == ATTACK) || (body.type == RANGED_ATTACK) || (body.type == HEAL)
          }).length > 0
        }
      })

      // const target = creep.pos.findClosestByPath(FIND_STRUCTURES)

      // if (creep.attack(target) == ERR_NOT_IN_RANGE) {
      //   creep.moveTo(target)
      //   return
      // }

      if (hostile_attacker) {
        if (Game.time % 5) {
          creep.say('FOUND YOU', true)
        }

        const rr = creep.attack(hostile_attacker)
        if (rr == ERR_NOT_IN_RANGE) {
          const r = creep.moveTo(hostile_attacker)
          if (r == ERR_NO_PATH) {
            const target = creep.pos.findClosestByPath(FIND_STRUCTURES)

            if (creep.attack(target) == ERR_NOT_IN_RANGE) {
              creep.moveTo(target)
            }
          }
          console.log(`Attacker ${r}, ${creep.name}`)
          return
        }
        console.log(`Attacker 2 ${rr}, ${creep.name}`)

        if (Game.time % 4) {
          creep.say('DIE!', true)
        }
      }
      else {
        if (creep.hits < creep.hitsMax) {
          creep.heal(creep)
          return
        }

        const hostile_spawn = creep.pos.findClosestByPath(FIND_HOSTILE_SPAWNS)
        if (hostile_spawn) {
          if (creep.attack(hostile_spawn) == ERR_NOT_IN_RANGE) {
            creep.moveTo(hostile_spawn)
            return
          }
        }
        else {
          const hostile_creep = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS)
          if (hostile_creep) {
            if (creep.attack(hostile_creep) == ERR_NOT_IN_RANGE) {
              creep.moveTo(hostile_creep)
              return
            }
          }
          else {
            const hostile_structure = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES)
            if (hostile_structure) {
              if (creep.attack(hostile_structure) == ERR_NOT_IN_RANGE) {
                creep.moveTo(hostile_structure)
                return
              }
            }
            else {
              const site = creep.pos.findClosestByPath(FIND_HOSTILE_CONSTRUCTION_SITES)
              if (site) {
                creep.moveTo(site)
                return
              }
              else {
                console.log(`No more targets in ${target_room_name}, ${creep.name}`)
              }
            }
          }
        }
      }
    })
  }

  private tempAttack() {
    this.creeps.forEach((creep) => {
      creep.moveTo(41, 13)

      const base_room = 'W48S34'
      const target_room = 'W48S33'

      if (creep.moveToRoom(base_room) == ActionResult.IN_PROGRESS) {
        return
      }
      // creep.moveTo(47, 43)
      creep.moveTo(24, 2)

      switch (creep.memory.type) {
        case CreepType.HEALER:
          const heal_target = creep.pos.findClosestByPath(FIND_MY_CREEPS, {
            filter: (c) => {
              return c.hits < c.hitsMax
            }
          })
          if (heal_target) {
            if (creep.heal(heal_target) == ERR_NOT_IN_RANGE) {
              creep.moveTo(heal_target)
              creep.rangedHeal(heal_target)
            }
          }
          else {
            creep.heal(creep)
          }

          // creep.moveTo(47, 43)
          creep.moveTo(24, 2)
          break

        case CreepType.ATTACKER:
          const memory: ManualMemory = creep.memory as ManualMemory

          if ((creep.hits > 2000) && memory.target_id) {
            const target = Game.getObjectById(memory.target_id) as Creep | Structure | undefined
            if (target) {
              if (creep.attack(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target)
              }
              return
            }
          }

          const target_creep = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS)

          if (target_creep) {
            creep.attack(target_creep)
          }

          if (creep.hits <= 1500) {
            if (creep.moveToRoom(base_room) == ActionResult.IN_PROGRESS) {
              return
            }
            // creep.moveTo(47, 43)
            creep.moveTo(24, 2)
          }
          else if (creep.hits > 2700) {
            if (creep.moveToRoom(target_room) == ActionResult.IN_PROGRESS) {
              return
            }
          }

          break

        default:
          break
      }

      // switch (creep.memory.type) {
      //   case CreepType.HEALER: {
      //   const attacker = Array.from(this.creeps.values()).filter(c=>c.memory.type == CreepType.ATTACKER)[0]
      //   if (attacker) {
      //     creep.moveTo(attacker)
      //   }
      //   const heal_target = creep.pos.findClosestByPath(FIND_MY_CREEPS, {
      //     filter: (c) => {
      //       return c.hits < c.hitsMax
      //     }
      //   })
      //   if (heal_target) {
      //     if (creep.heal(heal_target) == ERR_NOT_IN_RANGE) {
      //       creep.rangedHeal(heal_target)
      //     }
      //   }
      //   else {
      //     creep.heal(creep)
      //   }
      //     break
      // }

      //   case CreepType.ATTACKER:
      //   const memory: ManualMemory = creep.memory as ManualMemory

      //   if (creep.moveToRoom(target_room) == ActionResult.IN_PROGRESS) {
      //     return
      //   }

      //   if (memory.search_and_destroy) {
      //     creep.searchAndDestroy()
      //     return
      //   }

      //   const hostile_creep = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
      //   if (hostile_creep) {
      //     creep.destroy(hostile_creep)
      //     return
      //   }

      //   if ((creep.hits > 2000) && memory.target_id) {
      //     const target = Game.getObjectById(memory.target_id) as Creep | Structure | undefined
      //     if (target) {
      //       if (creep.attack(target) == ERR_NOT_IN_RANGE) {
      //         const healers = creep.pos.findInRange(FIND_MY_CREEPS, 1, {
      //           filter: (c: Creep) => {
      //             return c.memory.type == CreepType.HEALER
      //           }
      //         })
      //         if (healers.length > 0) {
      //           creep.moveTo(target)
      //         }
      //       }
      //       return
      //     }
      //   }
      //   else {
      //     creep.moveToRoom(base_room)
      //   }
      //   break

      //   default:
      //     break
      // }
    })
  }


  private preserve(): void {
    let flag_checked = false

    this.creeps.forEach((creep) => {
      const memory = creep.memory as ManualMemory
      const target_room_name = 'W49S34'
      const target_container_id = '5b0db80109027f220a404a60'
      let was_harvester = (creep.memory.status == CreepStatus.HARVEST)

      if (creep.moveToRoom(target_room_name) == ActionResult.IN_PROGRESS) {
        return
      }

      if ((creep.room.attacked) && (creep.hits < 1000)) {
        creep.moveToRoom('W50S34')
        Game.notify(`${target_room_name} is under attack`)
        return
      }
      else if (Game.time % 13 == 0) {
        const can_work = (creep.getActiveBodyparts(WORK) + creep.getActiveBodyparts(CARRY) + creep.getActiveBodyparts(MOVE)) > 0
        if (!can_work) {
          console.log(`Creep in ${creep.room.name} suicide ${creep.body.map(b=>b.type)}`)
          creep.suicide()
          return
        }
      }

      if (!flag_checked && (Game.time % 11 == 0)) {
        const has_construction_site = creep.room.find(FIND_CONSTRUCTION_SITES).length > 0

        if (has_construction_site == false) {
          const flag = creep.room.find(FIND_FLAGS)[0]

          if (flag && (creep.room.createConstructionSite(flag.pos, STRUCTURE_CONTAINER) == OK)) {
            console.log(`Place container construction site on ${flag.pos.x}, ${flag.pos.y} in ${creep.room}`)
            flag.remove()
          }
        }
      }

      // ---

      const is_going_to_die = ((creep.ticksToLive || 0) < 30)

      if (!creep.memory.status || (creep.memory.status == CreepStatus.NONE)) {
        creep.memory.status = CreepStatus.HARVEST
      }

      if (creep.carry.energy == 0) {
        creep.memory.status = CreepStatus.HARVEST
      }
      else if (is_going_to_die && (creep.carry.energy > 10)) {
        creep.memory.status = CreepStatus.ATTACK
      }

      if (creep.memory.status == CreepStatus.HARVEST) {
        (creep.memory as ManualMemory).repairing_structure_id = undefined

        if (creep.carry.energy == creep.carryCapacity) {
          creep.memory.status = CreepStatus.BUILD
        }
        else {
          const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE)

          if (source) {
            if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
              creep.moveTo(source)
            }
            return
          }
        }
      }

      if (creep.memory.status == CreepStatus.BUILD) {
        if (memory.repairing_structure_id) {
          const repair_target = Game.getObjectById(memory.repairing_structure_id) as AnyStructure | undefined
          if (repair_target && (repair_target.hits < (repair_target.hitsMax * 0.8))) {
            if (creep.repair(repair_target) == ERR_NOT_IN_RANGE) {
              creep.moveTo(repair_target)
            }
            return
          }
          else {
            (creep.memory as ManualMemory).repairing_structure_id = undefined
          }
        }

        const damaged_structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (structure.hits < (structure.hitsMax * 0.6))
              && (structure.id != target_container_id)
          }
        })

        if (damaged_structure) {
          (creep.memory as ManualMemory).repairing_structure_id = damaged_structure.id
          if (creep.repair(damaged_structure) == ERR_NOT_IN_RANGE) {
            creep.moveTo(damaged_structure)
          }
          return
        }
        else {
          const construction_site = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES)

          if (construction_site) {
            if (creep.build(construction_site) == ERR_NOT_IN_RANGE) {
              creep.moveTo(construction_site)
            }
            return
          }
          else {
            creep.memory.status = CreepStatus.CHARGE
          }
        }
      }

      if (creep.memory.status == CreepStatus.CHARGE) {

        let target = Game.getObjectById(target_container_id) as StructureContainer | undefined
        if (target) {
          creep.memory.status = CreepStatus.ATTACK
        }
      }

      if (creep.memory.status == CreepStatus.CHARGE) {
        if (creep.carry.energy == 0) {
          creep.memory.status = CreepStatus.HARVEST
          return
        }

        const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (structure.structureType == STRUCTURE_CONTAINER) && (structure.store.energy < structure.storeCapacity)
          }
        })

        if (container) {
          if (creep.transfer(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(container)
          }
          return
        }
        else {
          creep.memory.status = CreepStatus.ATTACK
        }
      }

      if (creep.memory.status == CreepStatus.ATTACK) {
        if ((creep.carry.energy == creep.carryCapacity) && !was_harvester && !is_going_to_die) {
          creep.memory.status = CreepStatus.BUILD
        }
        else {
          // const target = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES)
          let target = Game.getObjectById(target_container_id) as StructureContainer | undefined

          if (target && !is_going_to_die) {
            creep.withdraw(target, RESOURCE_ENERGY)
            if (creep.dismantle(target) == ERR_NOT_IN_RANGE) {
              creep.moveTo(target)
            }
            return
          }
          else if (was_harvester || is_going_to_die) {
            ErrorMapper.wrapLoop(() => {
              const drop = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 2, {
                filter: (d: Resource) => {
                  return (d.resourceType == RESOURCE_ENERGY)
                }
              })[0]

              if (drop) {
                if ((drop.pos.x == creep.pos.x) && (drop.pos.y == creep.pos.y)) {
                  creep.drop(RESOURCE_ENERGY)
                }
                else {
                  creep.moveTo(drop)
                  if (Game.time % 3 == 0) {
                    creep.drop(RESOURCE_ENERGY)
                  }
                }
              }
              else {
                creep.drop(RESOURCE_ENERGY)
              }
            })()
            creep.memory.status = CreepStatus.HARVEST
          }
          else {
            creep.memory.status = CreepStatus.HARVEST
          }
        }
      }
    })
  }
}
