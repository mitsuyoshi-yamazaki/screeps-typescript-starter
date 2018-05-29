import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

interface ManualMemory extends CreepMemory {
  target_id?: string
  target_x?: number
  target_y?: number
  search_and_destroy?: boolean
}

export class ManualSquad extends Squad {
  constructor(readonly name: string, readonly original_room_name: string) {
    super(name)
  }

  public get type(): SquadType {
    return SquadType.MANUAL
  }

  public get spawnPriority(): SpawnPriority {
    // return this.creeps.size < 1 ? SpawnPriority.URGENT : SpawnPriority.NONE
    return this.creeps.size < 2 ? SpawnPriority.LOW : SpawnPriority.NONE

    // return SpawnPriority.NONE
  }

  public static generateNewName(): string {
    return UID(SquadType.MANUAL)
  }

  public generateNewName(): string {
    return ManualSquad.generateNewName()
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    return energyAvailable >= 1700
  }

  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      CARRY, MOVE, CARRY, MOVE,
      CARRY, MOVE, CARRY, MOVE,
      CARRY, MOVE, CARRY, MOVE,
      CARRY, MOVE, CARRY, MOVE,
      WORK, MOVE, WORK, MOVE, WORK, MOVE,
      WORK, MOVE, WORK, MOVE, WORK, MOVE,
    ]
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.WORKER,
      let_thy_die: true,
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  public run(): void {
    let flag_checked = false

    this.creeps.forEach((creep) => {
      const target_room_name = 'W49S34'

      if (creep.moveToRoom(target_room_name) == ActionResult.IN_PROGRESS) {
        return
      }

      if (creep.room.attacked) {
        creep.moveToRoom('W50S34')
        Game.notify(`${target_room_name} is under attack`)
        return
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

      if (!creep.memory.status || (creep.memory.status == CreepStatus.NONE)) {
        creep.memory.status = CreepStatus.HARVEST
      }

      if (creep.carry.energy == 0) {
        creep.memory.status = CreepStatus.HARVEST
      }
      else if (((creep.ticksToLive || 0) < 30) && (creep.carry.energy > 10)) {
        creep.memory.status = CreepStatus.BUILD
      }

      if (creep.memory.status == CreepStatus.HARVEST) {
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
        const damaged_structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (structure.hits < (structure.hitsMax * 0.6))
          }
        })

        if (damaged_structure) {
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
        if (creep.carry.energy == creep.carryCapacity) {
          creep.memory.status = CreepStatus.BUILD
        }
        else {
          const target = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES)

          if (target) {
            if (creep.dismantle(target) == ERR_NOT_IN_RANGE) {
              creep.moveTo(target)
            }
            return
          }
          else {
            creep.memory.status = CreepStatus.HARVEST
          }
        }
      }
    })
  }

  public description(): string {
    const addition = this.creeps.size > 0 ? `, ${Array.from(this.creeps.values())[0].pos}` : ''
    return `${super.description()} ${addition}`
  }


  // --- Private ---
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

  private chargeLab(): void {
    // It's in room W44S42
    // const resource = RESOURCE_UTRIUM_ACID
    // const lab = Game.getObjectById('5af7db5db44f464c8ea3a7f5') as StructureLab

    const resource = RESOURCE_LEMERGIUM_ALKALIDE
    const lab = Game.getObjectById('5af7c5180ce89a3235fd46d8') as StructureLab

    if ((this.creeps.size > 0) && (lab.mineralAmount > 0) && (lab.mineralType != resource)) {
      console.log(`Manual.run lab mineral type is different from specified one ${resource}, ${lab.mineralType}, ${lab.id}`)
      return
    }

    this.creeps.forEach((creep) => {
      if (creep.memory.status == CreepStatus.NONE) {
        creep.memory.status = CreepStatus.HARVEST
      }

      const source = creep.room.terminal!
      let resource_type: ResourceConstant = RESOURCE_ENERGY

      if (creep.memory.status == CreepStatus.HARVEST) {
        if ((lab.mineralCapacity - lab.mineralAmount) < 400) {
          creep.memory.status = CreepStatus.NONE
          creep.say('😴')
          return
          }
        else if ((creep.carry.energy > 0) && ((creep.carry[resource] || 0) > 0)) {
          creep.memory.status = CreepStatus.CHARGE
        }
        else {
          let amount = 1

          if (creep.carry.energy > 0) {
            resource_type = resource
            amount = 380
          }

          const r = creep.withdraw(source, resource_type, amount)
          if (r == ERR_NOT_IN_RANGE) {
            creep.moveTo(source)
            creep.say('🏦')
          }
          else if (r != OK) {
            creep.say(`w${r}`)
          }
        }
      }
      if (creep.memory.status == CreepStatus.CHARGE) {
        if ((creep.carry.energy == 0) && ((creep.carry[resource] || 0) == 0)) {
          creep.memory.status = CreepStatus.CHARGE
        }
        else {
          if ((creep.carry.energy == 0) || (lab.energy == lab.energyCapacity)) {
            resource_type = resource

            if ((creep.carry[resource_type] || 0) == 0) {
              creep.memory.status = CreepStatus.HARVEST
            }
            else if (lab.mineralAmount == lab.mineralCapacity) {
              creep.memory.status = CreepStatus.NONE
            }
          }

          if (creep.transfer(lab, resource_type) == ERR_NOT_IN_RANGE) {
            creep.moveTo(lab)
            creep.say('💊')
          }
        }
      }
    })
  }

  private dismantle(target_room_name: string): void {
    this.creeps.forEach((creep, _) => {

      creep.drop(RESOURCE_ENERGY)

      if (creep.moveToRoom(target_room_name) != ActionResult.DONE) {
        creep.say(target_room_name)
        return
      }

      const target = creep.pos.findClosestByPath(FIND_HOSTILE_SPAWNS)

      if (target) {
        if (creep.dismantle(target) == ERR_NOT_IN_RANGE) {
          creep.moveTo(target)
        }
      }
      else {
        const structure = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
          filter: (structure) => {
            return structure.structureType != STRUCTURE_CONTROLLER
          }
        })
        if (structure) {
          if (creep.dismantle(structure) == ERR_NOT_IN_RANGE) {
            creep.moveTo(structure)
          }
        }
        else {
          const construction_site = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES)

          if (construction_site) {
            creep.moveTo(construction_site)
          }
          else {
            console.log(`No more targets in ${target_room_name}, ${creep.name}`)
            creep.memory.squad_name = 'worker5864301'
          }
        }
      }
    })
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

  private addAttacker(energyAvailable: number, spawnFunc: SpawnFunction): void {
        // const name = this.generateNewName()
    // const body: BodyPartConstant[] = [
    //   MOVE, MOVE, MOVE, MOVE, MOVE,
    //   HEAL, HEAL, HEAL, HEAL, HEAL, HEAL,
    //   MOVE,
    // ]
    // const memory: CreepMemory = {
    //   squad_name: this.name,
    //   status: CreepStatus.NONE,
    //   birth_time: Game.time,
    //   type: CreepType.HEALER,
    //   let_thy_die: true,
    // }

    // const result = spawnFunc(body, name, {
    //   memory: memory
    // })

    const name = this.generateNewName()
    const body: BodyPartConstant[] = [
      TOUGH,
      ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE,
      ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE,
      ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE,
      ATTACK, MOVE,
      MOVE
    ]
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.ATTACKER,
      let_thy_die: true,
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }
}
