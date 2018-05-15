import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export class ManualSquad extends Squad {
  constructor(readonly name: string, readonly original_room_name: string) {
    super(name)
  }

  public get type(): SquadType {
    return SquadType.MANUAL
  }

  public get spawnPriority(): SpawnPriority {
    // return this.creeps.size < 1 ? SpawnPriority.URGENT : SpawnPriority.NONE
    // return this.creeps.size < 120 ? SpawnPriority.URGENT : SpawnPriority.NONE

    return SpawnPriority.NONE
  }

  public static generateNewName(): string {
    return UID(SquadType.MANUAL)
  }

  public generateNewName(): string {
    return ManualSquad.generateNewName()
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    return energyAvailable >= 50
  }

  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    const name = this.generateNewName()
    const body: BodyPartConstant[] = [MOVE]
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.SCOUT,
      let_thy_die: false,
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  public run(): void {
    this.creeps.forEach((creep) => {
      creep.moveToRoom('W44S42')
    })

//     const tower = Game.getObjectById('5aeb9ed3eaccbf11e1955a7c') as StructureTower
//     let can_enter = false
//     const c = Array.from(this.creeps.values())[0]

//     if (tower && c) {
//       can_enter = !(!c.pos.findClosestByPath(FIND_HOSTILE_SPAWNS))
//     }

//     this.creeps.forEach((creep) => {
//       // if (creep.moveToRoom('W45S42') == ActionResult.IN_PROGRESS) {
//       //   return
//       // }

//       // creep.moveTo(19, 13, {
//       //   reusePath: 10,
//       //   // ignoreCreeps: true,
//       // })

// // ---

//       // //
//       if (creep.moveToRoom('W45S41') == ActionResult.IN_PROGRESS) {
//         return
//       }

//       const target = Game.getObjectById('5ac2d0ab0c49004bea3ce1f3') as Structure
//       if (target) {
//         creep.destroy(target)
//       }
//       else {
//         creep.searchAndDestroy()
//       }

//       // if (can_enter) {
//       //   creep.moveTo(tower!)
//       // }
//       // else {
//         // creep.moveTo(24, 45, {
//         //   reusePath: 2,
//         //   // ignoreCreeps: true,
//         // })

//       // }
//     })

    // this.withdrawFromLabs()

    // this.chargeLab()

    // this.dismantle()
    // this.attack()

    // const target_room_name = 'W44S43'

    // this.creeps.forEach((creep) => {
    //   // if (creep.searchAndDestroy() == ActionResult.DONE) {
    //   //   return
    //   // }
    //   if (creep.moveToRoom(target_room_name) == ActionResult.IN_PROGRESS) {
    //     return
    //   }
    // })
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

  private dismantle(): void {
    this.creeps.forEach((creep, _) => {
      const target_room_name = 'W44S43'

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
}
