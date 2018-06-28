import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export type HarvesterDestination = StructureContainer | StructureTerminal | StructureStorage | StructureLink

export interface RemoteHarvesterMemory extends CreepMemory {
  source_id: string
  room_contains_construction_sites: string[]
}

export interface RemoteHarvesterSquadMemory extends SquadMemory {
  room_name: string
  source_ids: string[]
  stop_spawming?: boolean
}

interface SourceInfo {
  id: string
  target: Source | Mineral | undefined
  harvesters: Creep[]
  store: StructureContainer | undefined
}

export class RemoteHarvesterSquad extends Squad {
  private scout: Creep | undefined
  private builder: Creep | undefined
  // private keeper: Creep | undefined  // not yet
  private source_info = new Map<string, SourceInfo>()
  private carriers: Creep[] = []

  private next_creep: CreepType | undefined

  constructor(readonly name: string, readonly room_name: string, readonly source_ids: string[], readonly destination: HarvesterDestination) {
    super(name)

    const room = Game.rooms[this.room_name] as Room | undefined

    this.source_ids.forEach((id) => {
      const info: SourceInfo = {
        id,
        target: Game.getObjectById(id) as Source | Mineral | undefined,
        harvesters: [],
        store: undefined, // @todo: 入れる
      }
      this.source_info.set(id, info)
    })

    this.creeps.forEach((creep, _) => {
      const memory = creep.memory as RemoteHarvesterMemory

      switch (creep.memory.type) {
        case CreepType.HARVESTER: {
          const info = this.source_info.get(memory.source_id)
          if (!info) {
            console.log(`RemoteHarvesterSquad specified source_id not exists ${this.name}, ${creep.name}, ${memory.source_id}, ${this.source_ids}`)
            return
          }
          info.harvesters.push(creep)
          break
        }

        case CreepType.CARRIER:
          this.carriers.push(creep)
          break

        case CreepType.SCOUT:
          this.scout = creep
          break

        default:
          console.log(`RemoteHarvesterSquad unexpected creep type ${creep.memory.type}, ${this.name}`)
          break
      }
    })

    if (!this.scout) {
      this.next_creep = CreepType.SCOUT
    }
    else {
      const harvester_max = 1 // @todo:
      let needs_harvester = false

      this.source_info.forEach((info) => {
        if (info.harvesters.length < harvester_max) {
          needs_harvester = true
        }
      })

      if (needs_harvester) {
        this.next_creep = CreepType.HARVESTER
      }
    }

    if (!this.next_creep && room) {

    }

    if (!this.next_creep && (this.carriers.length < 3)) {
      // this.next_creep = CreepType.CARRIER  // @fixme: uncomment
    }
  }

  public get type(): SquadType {
    return SquadType.REMOET_HARVESTER
  }

  public static generateNewName(): string {
    return UID(SquadType.REMOET_HARVESTER)
  }

  public generateNewName(): string {
    return RemoteHarvesterSquad.generateNewName()
  }

  // --
  public get spawnPriority(): SpawnPriority {
    const memory = Memory.squads[this.name] as RemoteHarvesterSquadMemory
    if (memory.stop_spawming) {
      return SpawnPriority.NONE
    }

    if (!this.next_creep) {
      return SpawnPriority.NONE
    }

    return SpawnPriority.LOW
  }

  public hasEnoughEnergy(energy_available: number, capacity: number): boolean {
    let max: number | undefined
    let energy_unit: number | undefined

    switch (this.next_creep) {
      case CreepType.SCOUT:
        return energy_available >= 50

      case CreepType.HARVESTER:
        energy_unit = 800
        max = energy_unit * 2
        break

      case CreepType.CARRIER:
        return false  // @todo:

      case CreepType.CONTROLLER_KEEPER:
        return false

      default:
        console.log(`RemoteHarvesterSquad.hasEnoughEnergy unexpected creep type ${this.next_creep}, ${this.name}`)
        return false
    }

    if (!max || !energy_unit) {
      console.log(`RemoteHarvesterSquad.hasEnoughEnergy unexpected error ${this.next_creep}, ${max}, ${energy_unit}, ${energy_available}, ${this.name}`)
      return false
    }

    capacity = Math.min((capacity - 50), max)

    const energy_needed = (Math.floor(capacity / energy_unit) * energy_unit)
    return energy_available >= energy_needed
  }

  public addCreep(energy_available: number, spawn_func: SpawnFunction): void {
    switch (this.next_creep) {
      case CreepType.SCOUT:
        this.addGeneralCreep(spawn_func, [MOVE], CreepType.SCOUT)
        return

      case CreepType.HARVESTER:
        this.addHarvester(energy_available, spawn_func)
        return

      case CreepType.CARRIER:
        this.addCarrier(energy_available, spawn_func)
        return

      case CreepType.CONTROLLER_KEEPER:
        return

      default:
        console.log(`RemoteHarvesterSquad.addCreep unexpected creep type ${this.next_creep}, ${this.name}`)
        return
    }
  }

  public run(): void {
    this.runScout()
    this.runHarvester()
    this.runCarrier()
  }

  public description(): string {
    return `${super.description()}, ${this.room_name}`
  }

  // ---
  private addHarvester(energy_available: number, spawn_func: SpawnFunction): void {
    const harvester_max = 1
    let source_id: string | undefined

    this.source_info.forEach((info) => {
      if (info.harvesters.length < harvester_max) {
        source_id = info.id
      }
    })

    if (!source_id) {
      console.log(`RemoteRoomHarvesterSquad.addHarvester no source ${this.source_ids}, ${Array.from(this.source_info.values()).map(info=>info.harvesters.length)}, ${this.name}`)
      return
    }

    // const body_unit: BodyPartConstant[] = [
    //   WORK, WORK, WORK,
    //   WORK, WORK, WORK,
    //   CARRY,
    //   MOVE, MOVE, MOVE,
    // ]
    const body_unit: BodyPartConstant[] = [
      WORK, WORK, WORK, WORK,
      CARRY, CARRY, CARRY, CARRY,
      MOVE, MOVE, MOVE, MOVE,
    ]

    const energy_unit = 800

    const name = this.generateNewName()
    let body: BodyPartConstant[] = []
    const memory: RemoteHarvesterMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.HARVESTER,
      should_notify_attack: false,
      let_thy_die: true,
      source_id,
      room_contains_construction_sites: [],
    }

    energy_available = Math.min(energy_available, energy_unit * 2)
    while (energy_available >= energy_unit) {
      body = body.concat(body_unit)
      energy_available -= energy_unit
    }

    const result = spawn_func(body, name, {
      memory: memory
    })
  }

  private addCarrier(energy_available: number, spawn_func: SpawnFunction): void {
    const source_id = this.source_ids[0]

    if (!source_id) {
      console.log(`RemoteRoomHarvesterSquad.addCarrier no source ${this.source_ids}, ${this.name}`)
      return
    }

    const body_unit: BodyPartConstant[] = [
      CARRY, CARRY, MOVE
    ]
    const energy_unit = 150

    const name = this.generateNewName()
    let body: BodyPartConstant[] = []
    const memory: RemoteHarvesterMemory = {
      squad_name: this.name,
      status: CreepStatus.NONE,
      birth_time: Game.time,
      type: CreepType.HARVESTER,
      should_notify_attack: false,
      let_thy_die: true,
      source_id,
      room_contains_construction_sites: [],
    }

    energy_available = Math.min(energy_available, (energy_unit * 8) + 100)
    while (energy_available >= energy_unit) {
      body = body.concat(body_unit)
      energy_available -= energy_unit
    }
    body = body.concat([WORK])

    const result = spawn_func(body, name, {
      memory: memory
    })
  }


  // --
  private runScout() {
    if (!this.scout) {
      return
    }
    const room = this.scout.room

    if (this.scout.moveToRoom(this.room_name) == ActionResult.IN_PROGRESS) {
      return
    }

    if (room.controller && (this.scout.moveTo(room.controller) == OK)) {
      const emoji = ['😆', '😄', '😐', '😴', '🤔', '🙃', '😃']
      const index = (Number(room.name.slice(1,3)) + Number(room.name.slice(4,6))) % emoji.length
      const sign = emoji[index]
      this.scout.signController(room.controller, sign)

      return
    }

    this.scout.moveTo(25, 25)
  }

  private runHarvester() {

    this.source_info.forEach((info) => {
      info.harvesters.forEach((creep) => {
        const memory = creep.memory as RemoteHarvesterMemory

        if ([CreepStatus.HARVEST, CreepStatus.CHARGE, CreepStatus.BUILD].indexOf(creep.memory.status) < 0) {
          creep.memory.status = CreepStatus.HARVEST
        }

        if (((Game.time % 19) == 3) && (memory.room_contains_construction_sites.indexOf(creep.room.name) < 0)) {
          const has_construction_site = creep.room.find(FIND_MY_CONSTRUCTION_SITES).length > 0

          if (has_construction_site) {
            (creep.memory as RemoteHarvesterMemory).room_contains_construction_sites.push(creep.room.name)
          }
        }

        if (creep.memory.status == CreepStatus.HARVEST) {
          if (creep.carry.energy > (creep.carryCapacity - (creep.getActiveBodyparts(WORK) * HARVEST_POWER))) {
            creep.memory.status = CreepStatus.CHARGE
          }
          else {
            if (creep.moveToRoom(this.room_name) == ActionResult.IN_PROGRESS) {
              return
            }

            if (!info.target) {
              const message = `RemoteHarvesterSquad.runHarvester no target found for ${info.id} in ${this.room_name}, ${this.name}`
              console.log(message)
              Game.notify(message)
              return
            }

            if (creep.harvest(info.target) == ERR_NOT_IN_RANGE) {
              creep.moveTo(info.target)
            }
          }
        }

        if (creep.memory.status == CreepStatus.CHARGE) {
          if (creep.carry.energy == 0) {
            creep.memory.status = CreepStatus.HARVEST
          }
          else if (memory.room_contains_construction_sites.indexOf(creep.room.name) >= 0) {
            creep.memory.status = CreepStatus.BUILD
          }
          else if (memory.room_contains_construction_sites[0]) {
            creep.moveToRoom(memory.room_contains_construction_sites[0])
          }
          else {
            // charge
          }
        }

        if (creep.memory.status == CreepStatus.BUILD) {
          if (creep.carry.energy == 0) {
            creep.memory.status = CreepStatus.HARVEST
          }
          else {
            const construction_site = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES)

            if (!construction_site) {
              const index = memory.room_contains_construction_sites.indexOf(creep.room.name)

              if (index >= 0) {
                (creep.memory as RemoteHarvesterMemory).room_contains_construction_sites.splice(index, 1)
              }

              creep.memory.status = CreepStatus.HARVEST
              return
            }

            creep.build(construction_site)
            creep.moveTo(construction_site)
          }
        }
      })
    })
  }

  private runCarrier(): void {
    this.carriers.forEach((creep) => {

    })

    // @todo
  }
}
