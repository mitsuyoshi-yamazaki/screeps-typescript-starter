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
  stop_spawming?: boolean
}

type MineralContainer = StructureTerminal | StructureStorage | StructureContainer

export class ManualSquad extends Squad {
  private any_creep: Creep | undefined

  private attackers: Creep[] = []
  private workers: Creep[] = []

  constructor(readonly name: string, readonly original_room_name: string) {
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
      case 'W51S29':
        // return this.creeps.size < 1 ? SpawnPriority.NORMAL : SpawnPriority.NONE
        return SpawnPriority.NONE

      case 'W44S7': {
        return SpawnPriority.NONE
      }

      case 'W43S5':
        return this.creeps.size < 1 ? SpawnPriority.HIGH : SpawnPriority.NONE

      case 'W48S6':
        const room = Game.rooms[this.original_room_name]
        if (!room || !room.storage || !room.storage.my) {
          return SpawnPriority.NONE
        }

        if ((room.storage.store[RESOURCE_HYDROGEN] || 0) == 0) {
          return SpawnPriority.NONE
        }
        return this.creeps.size < 5 ? SpawnPriority.LOW : SpawnPriority.NONE

      case 'W43S2': {
        return this.creeps.size < 4 ? SpawnPriority.LOW : SpawnPriority.NONE
      }

      case 'W42N1': {
        const energy_room_name = 'W42N3'
        const energy_room = Game.rooms[energy_room_name]
        if (!energy_room || !energy_room.storage || (energy_room.storage.store.energy < 800)) {
          return SpawnPriority.NONE
        }

        const colony_room_name = 'W47N2'
        const colony_room = Game.rooms[colony_room_name]
        if (!colony_room || !colony_room.storage || colony_room.storage.my) {
          return SpawnPriority.NONE
        }
        if ((_.sum(colony_room.storage.store) == 0)) {
          return SpawnPriority.NONE
        }

        // return this.creeps.size < 6 ? SpawnPriority.LOW : SpawnPriority.NONE

        return SpawnPriority.NONE
      }

      case 'W47N2':
        return this.creeps.size < 6 ? SpawnPriority.LOW : SpawnPriority.NONE

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
        return energy_available >= 150

      case 'W49S26':
        return energy_available >= 1600

      case 'W44S7':
        return false

      case 'W43S5':
        return energy_available >= 50

      case 'W48S6':
        return energy_available >= 1200

      case 'W43S2':
        const energy = (capacity >= 1200) ? 1200 : 800
        return energy_available >= energy

      case 'W42N1':
        return energy_available >= 1600

      case 'W47N2':
        return energy_available >= 1200

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

      case 'W51S29':
        this.addGeneralCreep(spawn_func, [MOVE, CARRY, CARRY], CreepType.CARRIER)
        return

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
          MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
          MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
          CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
          CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
        ]
        this.addGeneralCreep(spawn_func, body, CreepType.CARRIER)
        return
      }

      case 'W44S7': {
      }

      case 'W43S5': {
        this.addGeneralCreep(spawn_func, [MOVE, MOVE], CreepType.SCOUT)
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
        // 1600
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
        this.addGeneralCreep(spawn_func, body, CreepType.CARRIER, true)
        return
      }

      case 'W47N2': {
        // 1200
        const body: BodyPartConstant[] = [
          CARRY, CARRY, MOVE,
          CARRY, CARRY, MOVE,
          CARRY, CARRY, MOVE,
          CARRY, CARRY, MOVE,
          CARRY, CARRY, MOVE,
          CARRY, CARRY, MOVE,
          CARRY, CARRY, MOVE,
          CARRY, CARRY, MOVE,
        ]
        this.addGeneralCreep(spawn_func, body, CreepType.CARRIER, true)
        return
      }

      default:
        return
    }
  }

  public run(): void {

    switch (this.original_room_name) {

      case 'W51S29': {
        // if (!this.any_creep) {
        //   return
        // }
        // const link = Game.getObjectById('5b1f028bb08a2b269fba0f6e') as StructureLink | undefined
        // this.any_creep.transferLinkToStorage(link, {x: 24, y: 21})
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

        this.stealEnergyFrom(base_room_name, target_room_name, 20, 33, true)

        this.renewIfNeeded()
        return
      }

      case 'W44S7': {
        return
      }

      case 'W43S5': {
        const target_room_name = 'W44S5'

        // const callback = function(room_name: string): boolean | CostMatrix {
        //   const room = Game.rooms[room_name]
        //   if (!room) {
        //     return false
        //   }

        //   let matrix = new PathFinder.CostMatrix;

        //   room.find(FIND_HOSTILE_CREEPS).forEach((creep) => {
        //     for (let i = (creep.pos.x - 4); i <= (creep.pos.x + 4); i++) {
        //       if ((i < 0) || (i > 49)) {
        //         continue
        //       }

        //       for (let j = (creep.pos.y - 4); j <= (creep.pos.y + 4); j++) {
        //         if ((j < 0) || (j > 49)) {
        //           continue
        //         }

        //         matrix.set(i, j, 0xff)
        //       }
        //     }
        //   })

        //   return matrix
        // }

        this.creeps.forEach((creep) => {
          if (creep.moveToRoom(target_room_name) == ActionResult.IN_PROGRESS) {
            return
          }

          const memory = (creep.memory as ManualMemory)
          const x = memory.target_x || 25
          const y = memory.target_y || 25

          const callback = function(room_name: string): boolean | CostMatrix {
            if ((creep.room.name == room_name) && creep.room.cost_matrix) {
              return creep.room.cost_matrix
            }
            return false
          }

          const goal_position = new RoomPosition(x, y, target_room_name)
          const goal = { pos: goal_position, range: 2 }
          const path = PathFinder.search(creep.pos, goal, {
            roomCallback: callback,
          })

          if (path.path.length > 0) {
            const result = creep.moveByPath(path.path)

            if (result != OK) {
              creep.say(`E${result}`)
            }
          }
        })
        return
      }

      case 'W48S6': {
        // const room = Game.rooms[this.original_room_name]
        // if (!room || !room.terminal || room.terminal.my || !room.storage || !room.storage.my) {
        //   return
        // }

        // const terminal = room.terminal
        // const storage = room.storage

        // this.creeps.forEach((creep) => {
        //   if (_.sum(creep.carry) == 0) {
        //     if (creep.withdrawResources(terminal) == ERR_NOT_IN_RANGE) {
        //       creep.moveTo(terminal)
        //     }
        //   }
        //   else {
        //     if (creep.transferResources(storage) == ERR_NOT_IN_RANGE) {
        //       creep.moveTo(storage)
        //     }
        //   }
        // })

        // if ((_.sum(terminal.store) == 0)) {
        //   this.say(`DONE`)
        //   return
        // }

        const room = Game.rooms[this.original_room_name]
        const destination_room = Game.rooms['W44S7']

        if (!room || !destination_room || !destination_room.storage) {
          return
        }

        const target = (room.storage && ((room.storage.store[RESOURCE_HYDROGEN] || 0) > 0)) ? room.storage : undefined

        this.creeps.forEach((creep) => {
          creep.drop(RESOURCE_ENERGY)

          if (_.sum(creep.carry) == 0) {

            if ((creep.room.name == destination_room.name) && ((creep.ticksToLive || 0) < 400)) {
              creep.say(`DONE`)
              creep.moveTo(27, 23)
              // creep.memory.squad_name = 'harvester72598561'
              return
            }
            if (!target) {
              creep.say(`NO TGT`)
              console.log(`${this.name} no target ${target}`);

              (Memory.squads[this.name] as ManualSquadMemory).stop_spawming = true
              return
            }

            if (creep.withdrawResources(target, {include: [RESOURCE_HYDROGEN]}) == ERR_NOT_IN_RANGE) {
              creep.moveTo(target)
            }
            return
          }
          else {
            if (creep.moveToRoom(destination_room.name) == ActionResult.IN_PROGRESS) {
              return
            }

            if (!destination_room.storage) {
              creep.say(`NO STR`)
              return
            }

            if (creep.transferResources(destination_room.storage) == ERR_NOT_IN_RANGE) {
              creep.moveTo(destination_room.storage)
            }
          }
        })
        return
      }

      case 'W47N2': {
        const room = Game.rooms[this.original_room_name]
        if (!room || !room.storage) {
          return
        }

        const drop = room.find(FIND_DROPPED_RESOURCES, {
          filter: (resource) => {
            return (resource.resourceType != RESOURCE_ENERGY) && (resource.amount > 0)
          }
        })[0]

        this.creeps.forEach((creep) => {
          if (!drop) {
            const harvester_squad_name = 'harvester73492211'
            creep.memory.squad_name = harvester_squad_name
            return
          }

          if ((_.sum(creep.carry) > 0) && creep.room.storage) {
            if (creep.transferResources(creep.room.storage) == ERR_NOT_IN_RANGE) {
              creep.moveTo(creep.room.storage)
            }
          }
          else {
            if (creep.pickup(drop) == ERR_NOT_IN_RANGE) {
              creep.moveTo(drop)
            }
          }
        })



        // const target_room_name = 'W47N2'
        // const target_room = Game.rooms['target_room_name']
        // const target_ids = [
        //   '5abdf5820ddc2c47d1438f51', // bottom
        //   '5abe1b06e574217fca8bae23', // right
        //   '5abe1c4cfa53b34bc11eb870', // top
        // ]
        // let target: StructureWall | StructureRampart | undefined

        // for (const id of target_ids) {
        //   target = Game.getObjectById(id) as StructureWall | StructureRampart | undefined

        //   if (target) {
        //     break
        //   }
        // }

        // this.creeps.forEach((creep) => {
        //   if (creep.moveToRoom(target_room_name) == ActionResult.IN_PROGRESS) {
        //     return
        //   }

        //   if (target) {
        //     if (creep.dismantle(target) == ERR_NOT_IN_RANGE) {
        //       creep.moveTo(target)
        //     }
        //     if ((creep.room.name == 'W47N2') && (creep.pos.y == 48) && (creep.pos.x > 35)) {
        //       creep.move(LEFT)
        //     }
        //     return
        //   }
        // })
        // if (!target) {
        //   if (this.dismantleSpawnsAndExtensions(target_room_name) == ActionResult.IN_PROGRESS) {
        //     return
        //   }
        // }
        // if (target_room && !target) {
        //   (Memory.squads[this.name] as ManualSquadMemory).stop_spawming = true
        // }
        // return
      }

      case 'W42N1': {
        const energy_room_name = 'W42N3'
        const colony_room_name = 'W47N2'
        const main_room_name = 'W42N1'

        this.creeps.forEach((creep) => {
          if ((creep.ticksToLive || 0) > 1400) {
            creep.memory.status = CreepStatus.HARVEST
          }

          if ([CreepStatus.HARVEST, CreepStatus.CHARGE, CreepStatus.WAITING_FOR_RENEW].indexOf(creep.memory.status) < 0) {
            creep.memory.status = CreepStatus.HARVEST
          }

          if (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) {
            if (!creep.spawning && creep.room.spawns[0]) {
              creep.goToRenew(creep.room.spawns[0])
              return
            }
          }

          if (creep.memory.status == CreepStatus.HARVEST) {
            if (_.sum(creep.carry) == creep.carryCapacity) {
              creep.memory.status = CreepStatus.CHARGE
            }
            else {
              if ((creep.room.name == colony_room_name) && (_.sum(creep.carry) == 0)) {
                // creep.memory.squad_name = 'harvester73492211'
                creep.memory.squad_name = 'manualw47n2'
                return
              }


              if ((creep.room.name == main_room_name)) {
                if (!creep.spawning && ((creep.ticksToLive || 0) < 1000) && creep.room.spawns[0]) {
                  creep.goToRenew(creep.room.spawns[0])
                  return
                }
              }

              let target: StructureStorage | StructureTerminal | undefined

              if (creep.room.name == colony_room_name) {
                if (creep.room.storage && (_.sum(creep.room.storage.store) > 0)) {
                  target = creep.room.storage
                }
                else if (creep.room.terminal && (_.sum(creep.room.terminal.store) > 0)) {
                  target = creep.room.terminal
                }
                else {
                  creep.say(`DONE55`)
                  return
                }
              }
              else {
                if (creep.moveToRoom(energy_room_name) == ActionResult.IN_PROGRESS) {
                  return
                }

                if (creep.room.storage && (_.sum(creep.room.storage.store) > 0)) {
                  target = creep.room.storage
                }
                else {
                  creep.say(`DONE71`)
                  return
                }
              }

              const withdraw_result = creep.withdrawResources(target)
              if (withdraw_result == ERR_NOT_IN_RANGE) {
                creep.moveTo(target)
              }
            }
          }

          if (creep.memory.status == CreepStatus.CHARGE) {
            if (_.sum(creep.carry) == 0) {
              creep.memory.status = CreepStatus.HARVEST
              return
            }

            let destination: string

            if (creep.carry.energy > 0) {
              destination = colony_room_name
            }
            else {
              destination = main_room_name
            }

            if (creep.moveToRoom(destination) == ActionResult.IN_PROGRESS) {
              return
            }

            if (creep.room.storage && creep.room.storage.my) {
              const transfer_result = creep.transferResources(creep.room.storage)
              if (transfer_result == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.storage)
              }
              else if (transfer_result != OK) {
                creep.say(`E${transfer_result}`)
              }
              return
            }

            if (creep.room.name == colony_room_name) {
              if (creep.carry.energy > 0) {
                const charge_target = creep.find_charge_target()

                if (charge_target) {
                  if (creep.transfer(charge_target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(charge_target)
                  }
                }

                const x = 15
                const y = 11
                if ((creep.pos.x == x) && (creep.pos.y == y)) {
                  creep.drop(RESOURCE_ENERGY)
                }
                else {
                  creep.moveTo(x, y)
                }
              }
            }
            else {
              creep.say(`WTF`)
              console.log(`ManualSquad ${this.name} unknown error ${creep.name} at ${creep.pos}`)
            }
          }
        })

        // const target_room_name = 'W42N3'
        // if (this.stealEnergyFrom(this.original_room_name, target_room_name, 22, 28, false) == ActionResult.IN_PROGRESS) {
        //   return
        // }
        return
      }

      default:
        if (this.creeps.size > 0) {
          console.log(`ManualSquad.run error no script for ${this.original_room_name}`)
        }
        return
    }
  }

  public description(): string {
    const addition = this.creeps.size > 0 ? `, ${Array.from(this.creeps.values())[0].pos}` : ''
    return `${super.description()} ${addition}`
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

      if (!creep.boosted && lab && (lab.mineralType == RESOURCE_UTRIUM_ACID)) {
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

  private transferMineral(from: MineralContainer, to: MineralContainer, resource_type: ResourceConstant): void {
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
        const resource_type = creep.carrying_resources[0]
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

  private stealEnergyFrom(base_room_name: string, target_room_name: string, x: number, y: number, should_die: boolean): ActionResult {
    let result: ActionResult = ActionResult.DONE

    this.creeps.forEach((creep) => {
      if (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) {
        result = ActionResult.IN_PROGRESS
        return
      }

      if ((creep.memory.status != CreepStatus.HARVEST) && (creep.memory.status != CreepStatus.CHARGE)) {
        creep.memory.status = CreepStatus.HARVEST
      }

      if (creep.memory.status == CreepStatus.HARVEST) {
        if (creep.carry.energy > 0) {
          creep.memory.status = CreepStatus.CHARGE
        }
        else {
          if (creep.moveToRoom(target_room_name) == ActionResult.IN_PROGRESS) {
            result = ActionResult.IN_PROGRESS
            return
          }
          const target_room = Game.rooms[target_room_name]
          if (!target_room) {
            creep.say(`NO ROM`)
            return
          }

          let target: StructureStorage | StructureTerminal | StructureContainer | undefined

          if (target_room.storage && (target_room.storage.store.energy > 0)) {
            target = target_room.storage
          }
          else if (target_room.terminal && (target_room.terminal.store.energy > 0)) {
            target = target_room.terminal
          }
          else {
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
              filter: (structure) => {
                return (structure.structureType == STRUCTURE_CONTAINER) && (structure.store.energy > 0)
              }
            }) as StructureContainer | undefined
          }

          if (!target) {
            creep.say(`NO TGT`)
            if (should_die) {
              creep.memory.let_thy_die = true
            }
            return
          }

          const withdraw_result = creep.withdraw(target, RESOURCE_ENERGY)
          if (withdraw_result == ERR_NOT_IN_RANGE) {
            creep.moveTo(target)
            return
          }
          else if (withdraw_result != OK) {
            creep.say(`E${withdraw_result}`)
          }
          else {
            creep.memory.status = CreepStatus.CHARGE
          }
        }
      }

      if (creep.memory.status == CreepStatus.CHARGE) {
        if (creep.carry.energy == 0) {
          creep.memory.status = CreepStatus.HARVEST
          result = ActionResult.IN_PROGRESS
          return
        }

        if (creep.moveToRoom(base_room_name) == ActionResult.IN_PROGRESS) {
          result = ActionResult.IN_PROGRESS
          return
        }

        const charge_target = creep.find_charge_target()
        if (charge_target) {
          if (creep.transfer(charge_target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(charge_target)
          }
          result = ActionResult.IN_PROGRESS
          return
        }

        if (creep.room.controller && creep.room.controller.my && creep.room.storage) {
          if (creep.transfer(creep.room.storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.storage)
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
    let result_sum: ActionResult = ActionResult.DONE

    this.creeps.forEach((creep) => {
      let specified_target: Structure | undefined

      if (creep.room.name == target_room_name) {
        const memory = creep.memory as ManualMemory

        if (memory.target_id) {
          specified_target = Game.getObjectById(memory.target_id) as Structure | undefined

          if (specified_target && (specified_target as Structure).structureType) {
            if (creep.dismantle((specified_target as Structure)) == ERR_NOT_IN_RANGE) {
              creep.moveTo((specified_target as Structure))
            }
            result_sum = ActionResult.IN_PROGRESS
            return
          }
          else {
            creep.say(`NO T`)
            console.log(`No target ${memory.target_id} for ${this.name}`);
            (creep.memory as ManualMemory).target_id = undefined
          }
        }
      }

      const result = creep.dismantleObjects(target_room_name, specified_target, include_wall)

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
