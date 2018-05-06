import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

/**
 * WorkerSquad manages workers ([WORK, CARRY, MOVE] * n or [WORK * 2, CARRY * 2, MOVE * 3] * n)
 * to build or upgrade.
 */
export class WorkerSquad extends Squad {
  constructor(readonly name: string, readonly room_name: string, readonly delegated?: boolean) {
    super(name)

    // if (this.creeps.size < 5) {  // @fixme:
    //   console.log(`TEMP assign all creeps`)
    //   for (const creep_name in Game.creeps) {
    //     const creep = Game.creeps[creep_name]
    //     creep.memory.squad_name = this.name
    //     this.creeps.set(creep.name, creep)
    //   }
    //   }
  }

  public get type(): SquadType {
    return SquadType.WORKER
  }

  public get spawnPriority(): SpawnPriority {
    const really_need = (!this.delegated) && (this.creeps.size < 3)

    const room = Game.rooms[this.room_name]
    const max = this.room_name == 'W48S47' ? 7 : 6
    const needWorker = this.creeps.size < max  // @todo: implement

    if (really_need) {
      return SpawnPriority.HIGH
    }
    return needWorker ? SpawnPriority.LOW : SpawnPriority.NONE
  }

  public static generateNewName(): string {
    return `${SquadType.WORKER}${Game.time}`
  }

  public generateNewName(): string {
    return WorkerSquad.generateNewName()
  }

  public hasEnoughEnergy(energyAvailable: number, capacity: number): boolean {
    let energyUnit = 450

    if (capacity < energyUnit) {
      energyUnit = 200
    }

    const energyNeeded = Math.floor(capacity / energyUnit) * energyUnit // @todo: set upper limit

    return energyAvailable >= energyNeeded
  }

  public addCreep(energyAvailable: number, spawnFunc: SpawnFunction): void {
    let energyUnit = 450
    let bodyUnit: BodyPartConstant[] = [WORK, CARRY, MOVE, WORK, CARRY, MOVE, MOVE]
    let body: BodyPartConstant[] = []
    const name = this.generateNewName()
    const memory: CreepMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.WORKER,
    }

    if (energyAvailable < energyUnit) {
      energyUnit = 200
      bodyUnit = [WORK, CARRY, MOVE]
    }

    while (energyAvailable >= energyUnit) {
      body = body.concat(bodyUnit)
      energyAvailable -= energyUnit
    }

    const result = spawnFunc(body, name, {
      memory: memory
    })
  }

  public run(): void {
    let room = Game.rooms[this.room_name]
    let source: StructureStorage | StructureContainer | undefined
    if (room.name == 'W48S47') {
      source = Game.getObjectById('5aec04e52a35133912c2cb1b') as StructureStorage // @fixme: temp code
    }
    else if (room.name == 'W49S47') {
      // source = Game.getObjectById('5aecaab70409f23c73d4e993') as StructureContainer // @fixme: temp code
    }

    let needs_breaker = false
    let breaker_target: StructureWall | undefined
    if (this.room_name == 'W48S47') { // @fixme: temp code
      const no_breaker = false//Array.from(this.creeps.values()).filter((creep) => creep.memory.status == CreepStatus.BREAK).length == 0
      // const breaker_target = Game.getObjectById('5aef05e2f3c15a3918759783') as StructureWall
      const breaker_target = Game.getObjectById('5ac40f26d8e3f24bd9b94e7f') as StructureWall
      needs_breaker = no_breaker && !(!breaker_target)

      console.log(`BREAKER ${needs_breaker}, ${no_breaker}, ${breaker_target}`)
      if (!breaker_target) {
        console.log(`Wall dismissed`)
      }
    }

    for (const creep_name of Array.from(this.creeps.keys())) {
      const creep = this.creeps.get(creep_name)!

      if (creep.room.name != this.room_name) {
        creep.moveToRoom(this.room_name)
        continue
      }

      if ((this.room_name == 'W48S47') && needs_breaker && creep.memory.status != CreepStatus.WAITING_FOR_RENEW) { // @fixme: temp code
        needs_breaker = false
        creep.drop(RESOURCE_ENERGY)
        creep.memory.status = CreepStatus.BREAK
        console.log(`Assign breaker ${creep.name} in squad: ${this.name}`)
      }
      if (this.room_name == 'W48S47') { // @fixme: temp code
        console.log(`BREAKER target ${breaker_target}`)
      }
      if ((creep.memory.status == CreepStatus.BREAK) && (Game.getObjectById('5ac40f26d8e3f24bd9b94e7f') as StructureWall)) {
        if (creep.carry.energy == creep.carryCapacity) {
          const link = Game.getObjectById('5aeed7712e007b09769feb8f') as StructureLink
          if (creep.transfer(link, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(link)
          }
        }
        const r = creep.dismantle(Game.getObjectById('5ac40f26d8e3f24bd9b94e7f') as StructureWall)
        let a: any
        if ((r == ERR_NOT_IN_RANGE) || (r == ERR_INVALID_TARGET)) {
          creep.drop(RESOURCE_ENERGY)
          a = creep.moveTo(Game.getObjectById('5ac40f26d8e3f24bd9b94e7f') as StructureWall)
        }
        console.log(`BREAK ${r}, ${creep.name}, ${a}`)//, ${breaker_target!}, ${breaker_target!.id}`)
        continue
      }

      const needs_renew = (creep.memory.status == CreepStatus.WAITING_FOR_RENEW) || ((creep.ticksToLive || 0) < 300)

      if (needs_renew) {
        if (creep.room.spawns.length > 0) {
          creep.goToRenew(creep.room.spawns[0])
          continue
        }
      }

      if ((room.name == 'W49S47') || (room.name == 'W44S42')) {
        source = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (structure.structureType == STRUCTURE_CONTAINER)
                   && ((structure as StructureContainer).store.energy > 50)
          }
        }) as StructureContainer
      }
      creep.work(room, source)
    }
  }
}
