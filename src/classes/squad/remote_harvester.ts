import { UID } from "classes/utils"
import { Squad, SquadType, SquadMemory, SpawnPriority, SpawnFunction } from "./squad"
import { CreepStatus, ActionResult, CreepType } from "classes/creep"

export type HarvesterDestination = StructureContainer | StructureTerminal | StructureStorage | StructureLink

export interface RemoteHarvesterMemory extends CreepMemory {
  source_id: string
}

export interface RemoteHarvesterSquadMemory extends SquadMemory {
  stop_spawming?: boolean
}

interface SourceInfo {
  id: string
  harvesters: Creep[]
}

export class RemoteHarvesterSquad extends Squad {
  private scout: Creep | undefined
  // private keeper: Creep | undefined  // not yet
  private source_info = new Map<string, SourceInfo>()
  private carriers: Creep[] = []

  private next_creep: CreepType | undefined

  constructor(readonly name: string, readonly room_name: string, readonly source_ids: string[], readonly destination: HarvesterDestination) {
    super(name)

    this.source_ids.forEach((id) => {
      const info: SourceInfo = {
        id,
        harvesters: [],
      }
      this.source_info.set(id, info)
    })

    this.creeps.forEach((creep, _) => {
      const memory = creep.memory as RemoteHarvesterMemory

      switch (creep.memory.type) {
        case CreepType.HARVESTER:
          const info = this.source_info.get(memory.source_id)
          if (!info) {
            console.log(`RemoteHarvesterSquad specified source_id not exists ${this.name}, ${creep.name}, ${memory.source_id}, ${this.source_ids}`)
            return
          }
          info.harvesters.push(creep)
          break

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
      const harvester_max = 1
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
        max = 1600
        energy_unit = 800
        break

      case CreepType.CARRIER:
        return false

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

    capacity = Math.min(capacity, max)

    const energy_needed = (Math.floor((capacity - 50) / energy_unit) * energy_unit)
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

    const body_unit: BodyPartConstant[] = [
      WORK, WORK, WORK,
      WORK, WORK, WORK,
      CARRY,
      MOVE, MOVE, MOVE,
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
    }

    energy_available = Math.min(energy_available, 1600)
    while (energy_available >= energy_unit) {
      body = body.concat(body_unit)
      energy_available -= energy_unit
    }

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
  }

  private runHarvester() {
    // @todo
  }
}
