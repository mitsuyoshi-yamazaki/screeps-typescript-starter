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
    return SpawnPriority.NONE
  }

  public static generateNewName(): string {
    return `${SquadType.MANUAL}${Game.time}`
  }

  public generateNewName(): string {
    return ManualSquad.generateNewName()
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    return energyAvailable >= 750
  }

  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    const name = this.generateNewName()
    const body: BodyPartConstant[] = [TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, HEAL]
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.ATTACKER,
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  public run(): void {
    // this.dismantle()
    this.attack()
  }

  private dismantle(): void {
    this.creeps.forEach((creep, _) => {
      const target_room_name = 'W49S48'

      creep.drop(RESOURCE_ENERGY)

      if (creep.moveToRoom(target_room_name) != ActionResult.DONE) {
        return
      }

      const target = Game.getObjectById('5aea6c149341002d688f97e8') as StructureSpawn

      if (target) {
        if (creep.dismantle(target) == ERR_NOT_IN_RANGE) {
          creep.moveTo(target)
        }
      }
      else {
        // console.log(`No more targets in ${target_room_name}, ${creep.name}`)
        const construction_site = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES)

        if (construction_site) {
          creep.moveTo(construction_site)
        }
      }
    })
  }

  private attack(): void {
    this.creeps.forEach((creep, _) => {
      const target_room_name = 'W45S48'

      if (creep.moveToRoom(target_room_name) != ActionResult.DONE) {
        return
      }

      const hostile_attacker = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
        filter: (creep) => {
          return creep.getActiveBodyparts(ATTACK) > 0
        }
      })

      if (hostile_attacker) {
        if (Game.time % 5) {
          creep.say('FOUND YOU', true)
        }

        if (creep.attack(hostile_attacker) == ERR_NOT_IN_RANGE) {
          creep.moveTo(hostile_attacker)
          return
        }
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
